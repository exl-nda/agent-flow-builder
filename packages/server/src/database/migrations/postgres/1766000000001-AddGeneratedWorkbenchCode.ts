import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGeneratedWorkbenchCode1766000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS generated_workbench_code (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "chatflowId" uuid NOT NULL,
                "codeType" varchar(50) NOT NULL,
                code text NOT NULL,
                "workspaceId" text NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_generated_workbench_code_id" PRIMARY KEY (id),
                CONSTRAINT "UQ_generated_workbench_code_chatflow_codeType_workspace" UNIQUE ("chatflowId", "codeType", "workspaceId")
            );`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_generated_workbench_code_chatflowId" ON generated_workbench_code ("chatflowId");`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_generated_workbench_code_codeType" ON generated_workbench_code ("codeType");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS generated_workbench_code`)
    }
}
