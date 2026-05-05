### Functional Requirements

- user should be able to view the list of available items
- user should be able to add item to the cart and place the order
- user should be shown expected delivery time
- user should be able to view the real time location of delivery person

Hello interview

- customers should be able to query availability of items, deliverable in 1 hour, by location (ie. the effective availability is the union of all inventory in nearby distribution centres)
- Customer should be able to order multiple items at same time.

Out of scope

- payment handling
- driver routing and deliveries
- search functionality (system is strictly concerned with availability and ordering)
- Cancellations and returns.

### Non-functional requirements

- system should support DAU of 100k
- availability query should be fast enough for better ux (100ms - 200ms) latency.
- system should prevent double booking.

Hello interview

- availability request should be fast (< 100ms)
- Ordering should be strongly consistent. 2 users should not be able to purchase same item.
- system should be able to support 10k DCs (distribution centres) and 100k items in the catalog across DCs
- order volume will be 10M orders/day

### Core Entities

- users ⇒ {id, name, email}
- items ⇒ {id, category, variant, skuId}
- sku {id, availableItemsCount, lockedItemsCount, expiry}
- orders {id, skuId, userId, paymentType}
- Distribution centres ⇒ {id, location, }

Hello interview
- he suggests not to design the full data model at this point. thinks that we ll need to have a better idea of how the system fits together overall. but figuring out the entities will give us the right blocks to build the system

- Item
- Inventory
- Distribution Center
- Order
- Order Item

*How item differs from inventory. ⇒ item represent what is seen by the customers eg Lays. Inventory keeps the track of where the physical item are actually located. so **Inventory** entity is a physical item at a specific location. we will sup up inventory to determine quantity available to a specific user for a specific item.*

### Defining the Api

`Get /v1/availability?lat={lat}&long={long}&keyword={word}&page_size={}&page_num={}`
{
items: {
    name, quantity
 }
}

`Post /v1/order` 

{lat, long, items[]} ⇒ Order | Failure

### High Level Design

Hello interview

1. **Customers should be able to query availability of items**
- find DCs that are close enough to deliver in 1 hour
- we can union all inventories and return to the user
- To find nearby DCs we need an api which takes lat long and returns DCs in 1 hour radius
- a very basic version of this might use a simple euclidean distance formula but we can also use haversine formula as well
- we will visit this in deep dive
- next part is querying inventory table and items table to get the item name and description and quantity.
- In many e commerce systems catalog is stored separately from the inventory because of different consumers and workloads. But in our case we will store them in the same database to keep things simple.
- But we will note to our interviewer that catalog will have search index (like elasticsearch) to allow searching the catalog.

Then we have,

- Availability service: handles req from users given a location
- Nearby Service: syncs with databases from nearby DCs and uses an external Travel time service to calculate travel times from DCs
- Inventory Table : a replicated db table which returns the inventory available for each item in DC.


- we make request to  availability service with a user location
- availability service calls nearby service with location which returns a list of DCs that can deliver to my location
- Availabililty service calls database with the list of DC ids to get the requried result.

1. **Customers should be able to order items**
- we need strong consistency for order placing to make sure that no two users are ordering the same item.
- Latency may not be a concern here but we need to make sure that given inventory is promised only to single user.

- one of the solution is to use 2 data stores with distributed lock. but this also introduces lot of challenges and edge cases since one service may crash leading to a incosistent state. another case is that if 2 users have overllaping inventory it may lead to deadlock (user 1 and user 2 are trying to buy  A and B, user 1 has lock on A while user2 has lock on B)

- Better solution is to use singular atomic transaction in postgres.
- Use a single transaction with isolation level SERIALIZABLE.
- There may still be few drawbacks of this approach as this leads to coupling of inventory and order service. We cannot use best datastore for each entity or use case.

Order Flow

- user makes request to **OrderService** to place order for items A, B and C
- OrderService tries creating order → creates a txn → checks inventory > 0 if any item out of stock txn fails → else txn records the order and updates the status for inventory items A, B and C to “Ordered” → new row created in orders table and orderItems table → txn is commited.


- Both availability and order services use nearby service to look up nearby DCs
- a singular postgres datbase for inventory and orders partitioned by regions.
- availability service reads via read replicas and order service writes to leader using atomic transaction to avoid double writes.

### Deep Dives.

1. make availability lookups incorporate traffic and driver time
- simple option is to measure euclidean distance or even haversine but the problem is this is too simple and not a correct option
- query all DCs using travel time estimation service. problem is too much unneccessary querying as most of DCs will be further from 1hr mark.
- Using a hybrid approach where we only filter  DCs in say 60 miles radius and then apply actual travel time estimation logic to filter further.

1. Make availability lookups fast and scalable
- for every availability check we query DCs from our database. rough estimate
    - we estimated 10M order per day
    - lets say user will look at 10 pages across search homepage etc before buying 1 item.
    - additionally only 5% people are buying rest are just shopping
- Queries = (10M /( 100k seconds perday)) * (10 /0.05) = 20k queries per second

This is a classic case of scaling reads where inventory lookups vastly outnumber actual purchases. So with 20k rps with occasional inventory updates, aggressive caching with short TTL becomes critical.

option 1 

- add a redis cache for inventory with 1 minute TTL
- availability service can query cache with given inputs to get the data
- one challenge is that cache needs to be up to date with inventory data and our order table need to expire affected cache entries when it writes to inventory table.

Option 2

- we can advantage of the fact that we are only ever going to read from nearby collection of DCs.
- so we group DCs by region id could be their  last 3 digits of zip code.
- then we partition inventory based on this id. now all queries go mostly to 1 or 2 DCs
- We can use read replicas for high availability of  DC query since we can be okay with slight inconsistency. Only our order service needs to be strongly consistent so order queries go to the leader.
- challenges include sizing of replicas to balance the load. need to take care that we are not overloading any one replica