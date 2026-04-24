import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGeneratedWorkbenchCode1766000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`generated_workbench_code\` (
                \`id\` varchar(36) NOT NULL,
                \`chatflowId\` varchar(255) NOT NULL,
                \`codeType\` varchar(50) NOT NULL,
                \`code\` longtext NOT NULL,
                \`workspaceId\` text NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_generated_workbench_code_chatflow_codeType_workspace\` (\`chatflowId\`, \`codeType\`, \`workspaceId\`(255)),
                KEY \`IDX_generated_workbench_code_chatflowId\` (\`chatflowId\`),
                KEY \`IDX_generated_workbench_code_codeType\` (\`codeType\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`generated_workbench_code\``)
    }
}
