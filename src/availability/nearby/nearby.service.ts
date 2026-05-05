import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionCenter } from '../../distribution-center/entities/distribution-center.entity';

@Injectable()
export class NearbyService {
  constructor(
    @InjectRepository(DistributionCenter)
    private readonly dcRepository: Repository<DistributionCenter>,
  ) {}

  /**
   * Finds IDs of active Distribution Centers within a specific radius (in KM).
   * 
   * @param lat User latitude
   * @param lon User longitude
   * @param radiusKm Radius in kilometers (default 10km for '1 hour delivery' estimate)
   */
  async findNearbyDcIds(
    lat: number,
    lon: number,
    radiusKm: number = 10,
  ): Promise<string[]> {
    /**
     * Haversine formula in pure SQL.
     * 6371 is the Earth's radius in KM.
     * 
     * NOTE: This is a Full Table Scan. In Phase 6, we will move this to PostGIS 
     * with an SP-GiST index to avoid calculating distance for every single DC 
     * in the database.
     */
    const query = `
      SELECT id FROM (
        SELECT id, (
          6371 * acos(
            least(1, 
              cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            )
          )
        ) AS distance
        FROM distribution_centers
        WHERE "isActive" = true
      ) AS dcs_with_distance
      WHERE distance <= $3
      ORDER BY distance ASC
    `;

    // Using repository.query for raw SQL access
    const results = await this.dcRepository.query(query, [lat, lon, radiusKm]);

    return results.map((r: { id: string }) => r.id);
  }
}
