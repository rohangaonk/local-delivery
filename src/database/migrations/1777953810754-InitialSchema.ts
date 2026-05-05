import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1777953810754 implements MigrationInterface {
    name = 'InitialSchema1777953810754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING', "customerLatitude" double precision NOT NULL, "customerLongitude" double precision NOT NULL, "totalAmountInPaise" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "distribution_centers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "address" character varying(255) NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_883a075ae65ba16833df4ca64ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inventories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "itemId" uuid NOT NULL, "distributionCenterId" uuid NOT NULL, "availableCount" integer NOT NULL DEFAULT '0', "lockedCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b1946392ffdcb50cfc6ac78c0e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_54621f13ae8e8a13158b07ddc2" ON "inventories" ("itemId", "distributionCenterId") `);
        await queryRunner.query(`CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "category" character varying(50) NOT NULL, "priceInPaise" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "itemId" uuid NOT NULL, "fulfilledById" uuid NOT NULL, "quantity" integer NOT NULL, "unitPriceInPaise" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "inventories" ADD CONSTRAINT "FK_dba77c53cc779a4c890647f6c74" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventories" ADD CONSTRAINT "FK_1475a503c5f213517d968c3afc3" FOREIGN KEY ("distributionCenterId") REFERENCES "distribution_centers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_e253fbd572683bcc785a70cbca7" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f3964eb3cfa099d074743fd3c0c" FOREIGN KEY ("fulfilledById") REFERENCES "distribution_centers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f3964eb3cfa099d074743fd3c0c"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_e253fbd572683bcc785a70cbca7"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`ALTER TABLE "inventories" DROP CONSTRAINT "FK_1475a503c5f213517d968c3afc3"`);
        await queryRunner.query(`ALTER TABLE "inventories" DROP CONSTRAINT "FK_dba77c53cc779a4c890647f6c74"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54621f13ae8e8a13158b07ddc2"`);
        await queryRunner.query(`DROP TABLE "inventories"`);
        await queryRunner.query(`DROP TABLE "distribution_centers"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    }

}
