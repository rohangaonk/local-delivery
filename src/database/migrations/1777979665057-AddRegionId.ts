import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRegionId1777979665057 implements MigrationInterface {
    name = 'AddRegionId1777979665057'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add regionId to DCs
        await queryRunner.query(`ALTER TABLE "distribution_centers" ADD "regionId" integer NOT NULL DEFAULT '1'`);

        // Convert inventories to a partitioned table
        // 1. Drop old foreign keys on inventories
        await queryRunner.query(`ALTER TABLE "inventories" DROP CONSTRAINT "FK_1475a503c5f213517d968c3afc3"`);
        await queryRunner.query(`ALTER TABLE "inventories" DROP CONSTRAINT "FK_dba77c53cc779a4c890647f6c74"`);

        // 2. Rename old table
        await queryRunner.query(`ALTER TABLE "inventories" RENAME TO "inventories_old"`);
        await queryRunner.query(`ALTER INDEX "IDX_54621f13ae8e8a13158b07ddc2" RENAME TO "IDX_54621f13ae8e8a13158b07ddc2_old"`);

        // 3. Create new partitioned table
        await queryRunner.query(`
            CREATE TABLE "inventories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "itemId" uuid NOT NULL,
                "distributionCenterId" uuid NOT NULL,
                "regionId" integer NOT NULL DEFAULT '1',
                "availableCount" integer NOT NULL DEFAULT '0',
                "lockedCount" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_inventories_part" PRIMARY KEY ("id", "regionId")
            ) PARTITION BY LIST ("regionId");
        `);

        // 4. Create child partitions for regions 1, 2, 3
        await queryRunner.query(`CREATE TABLE "inventories_region_1" PARTITION OF "inventories" FOR VALUES IN (1)`);
        await queryRunner.query(`CREATE TABLE "inventories_region_2" PARTITION OF "inventories" FOR VALUES IN (2)`);
        await queryRunner.query(`CREATE TABLE "inventories_region_3" PARTITION OF "inventories" FOR VALUES IN (3)`);

        // 5. Create unique index containing the partition key
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_inventories_item_dc_region" ON "inventories" ("itemId", "distributionCenterId", "regionId")`);

        // 6. Restore foreign keys
        await queryRunner.query(`ALTER TABLE "inventories" ADD CONSTRAINT "FK_inventories_items" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventories" ADD CONSTRAINT "FK_inventories_dcs" FOREIGN KEY ("distributionCenterId") REFERENCES "distribution_centers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // 7. Drop old table
        await queryRunner.query(`DROP TABLE "inventories_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventories" DROP CONSTRAINT "FK_inventories_dcs"`);
        await queryRunner.query(`ALTER TABLE "inventories" DROP CONSTRAINT "FK_inventories_items"`);
        await queryRunner.query(`DROP TABLE "inventories"`);

        await queryRunner.query(`CREATE TABLE "inventories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "itemId" uuid NOT NULL, "distributionCenterId" uuid NOT NULL, "availableCount" integer NOT NULL DEFAULT '0', "lockedCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b1946392ffdcb50cfc6ac78c0e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_54621f13ae8e8a13158b07ddc2" ON "inventories" ("itemId", "distributionCenterId") `);
        await queryRunner.query(`ALTER TABLE "inventories" ADD CONSTRAINT "FK_dba77c53cc779a4c890647f6c74" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventories" ADD CONSTRAINT "FK_1475a503c5f213517d968c3afc3" FOREIGN KEY ("distributionCenterId") REFERENCES "distribution_centers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "distribution_centers" DROP COLUMN "regionId"`);
    }

}
