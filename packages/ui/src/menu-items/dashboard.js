// assets
import {
    IconList,
    IconUsersGroup,
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconChartHistogram,
    IconUserEdit,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock,
    IconListCheck,
    IconBriefcase,
    IconHome
} from '@tabler/icons-react'

// constant
const icons = {
    IconHierarchy,
    IconUsersGroup,
    IconBuildingStore,
    IconList,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconUserEdit,
    IconChartHistogram,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock,
    IconListCheck,
    IconBriefcase,
    IconHome
}

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'primary',
            title: 'BUILDER',
            type: 'group',
            children: [
                // {
                //     id: 'chatflows',
                //     title: 'Chatflows',
                //     type: 'item',
                //     url: '/chatflows',
                //     icon: icons.IconHierarchy,
                //     breadcrumbs: true,
                //     permission: 'chatflows:view'
                // },
                {
                    id: 'agentflows',
                    title: 'Agent Pipeline',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconUsersGroup,
                    breadcrumbs: true,
                    permission: 'agentflows:view',
                    countBadge: '24'
                },
                // {
                //     id: 'executions',
                //     title: 'Executions',
                //     type: 'item',
                //     url: '/executions',
                //     icon: icons.IconListCheck,
                //     breadcrumbs: true,
                //     permission: 'executions:view'
                // },
                // {
                //     id: 'assistants',
                //     title: 'Assistants',
                //     type: 'item',
                //     url: '/assistants',
                //     icon: icons.IconRobot,
                //     breadcrumbs: true,
                //     permission: 'assistants:view'
                // },
                // {
                //     id: 'marketplaces',
                //     title: 'Marketplaces',
                //     type: 'item',
                //     url: '/marketplaces',
                //     icon: icons.IconBuildingStore,
                //     breadcrumbs: true,
                //     permission: 'templates:marketplace,templates:custom'
                // },
                {
                    id: 'tools',
                    title: 'Tools',
                    type: 'item',
                    url: '/tools',
                    icon: icons.IconTool,
                    breadcrumbs: true,
                    permission: 'tools:view',
                    countBadge: '32'
                },
                {
                    id: 'credentials',
                    title: 'Connectors',
                    type: 'item',
                    url: '/credentials',
                    icon: icons.IconBriefcase,
                    breadcrumbs: true,
                    permission: 'credentials:view',
                    countBadge: '8'
                }
                // {
                //     id: 'variables',
                //     title: 'Variables',
                //     type: 'item',
                //     url: '/variables',
                //     icon: icons.IconVariable,
                //     breadcrumbs: true,
                //     permission: 'variables:view'
                // },
                // {
                //     id: 'apikey',
                //     title: 'API Keys',
                //     type: 'item',
                //     url: '/apikey',
                //     icon: icons.IconKey,
                //     breadcrumbs: true,
                //     permission: 'apikeys:view'
                // },
                // {
                //     id: 'document-stores',
                //     title: 'Document Stores',
                //     type: 'item',
                //     url: '/document-stores',
                //     icon: icons.IconFiles,
                //     breadcrumbs: true,
                //     permission: 'documentStores:view'
                // }
            ]
        },
        {
            id: 'organization',
            title: 'ORGANIZATION',
            type: 'group',
            children: [
                {
                    id: 'shared-library',
                    title: 'Shared Library',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconHome,
                    breadcrumbs: true,
                    disabled: true
                },
                {
                    id: 'team-access',
                    title: 'Team Access',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconUsersGroup,
                    breadcrumbs: true,
                    disabled: true
                }
            ]
        }
    ]
}

export default dashboard
