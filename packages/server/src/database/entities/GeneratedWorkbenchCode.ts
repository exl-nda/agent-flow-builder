import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, Index, Unique } from 'typeorm'

@Entity()
@Unique(['chatflowId', 'codeType', 'workspaceId'])
export class GeneratedWorkbenchCode {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    chatflowId: string

    @Index()
    @Column({ type: 'varchar', length: 50 })
    codeType: string

    @Column({ type: 'text' })
    code: string

    @Column({ nullable: false, type: 'text' })
    workspaceId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
