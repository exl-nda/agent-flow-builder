import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGeneratedWorkbenchCode1766000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "generated_workbench_code" (
                "id" varchar PRIMARY KEY NOT NULL,
                "chatflowId" varchar NOT NULL,
                "codeType" varchar(50) NOT NULL,
                "code" text NOT NULL,
                "workspaceId" text NOT NULL,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_generated_workbench_code_chatflow_codeType_workspace" UNIQUE ("chatflowId", "codeType", "workspaceId")
            );`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_generated_workbench_code_chatflowId" ON "generated_workbench_code" ("chatflowId");`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_generated_workbench_code_codeType" ON "generated_workbench_code" ("codeType");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "generated_workbench_code"`)
    }
}
