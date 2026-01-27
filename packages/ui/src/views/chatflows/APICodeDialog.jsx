import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'

import {
    Tabs,
    Tab,
    Dialog,
    DialogContent,
    DialogTitle,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Stack,
    Card,
    Button
} from '@mui/material'
import { CopyBlock, atomOneDark } from 'react-code-blocks'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTheme } from '@mui/material/styles'
import { useAuth } from '@/hooks/useAuth'

// Project import
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import ShareChatbot from './ShareChatbot'
import EmbedChat from './EmbedChat'
import { Available } from '@/ui-component/rbac/available'

// Const
import { baseURL } from '@/store/constant'
import { SET_CHATFLOW } from '@/store/actions'

// Images
import pythonSVG from '@/assets/images/python.svg'
import javascriptSVG from '@/assets/images/javascript.svg'
import cURLSVG from '@/assets/images/cURL.svg'
import EmbedSVG from '@/assets/images/embed.svg'
import ShareChatbotSVG from '@/assets/images/sharing.png'
import settingsSVG from '@/assets/images/settings.svg'
import { IconBulb, IconBox, IconVariable, IconExclamationCircle } from '@tabler/icons-react'

// API
import apiKeyApi from '@/api/apikey'
import chatflowsApi from '@/api/chatflows'
import configApi from '@/api/config'
import variablesApi from '@/api/variables'

// Hooks
import useApi from '@/hooks/useApi'
import { CheckboxInput } from '@/ui-component/checkbox/Checkbox'
import { TableViewOnly } from '@/ui-component/table/Table'

// Helpers
import { unshiftFiles, getConfigExamplesForJS, getConfigExamplesForPython, getConfigExamplesForCurl } from '@/utils/genericHelper'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`attachment-tabpanel-${index}`}
            aria-labelledby={`attachment-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

const APICodeDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const theme = useTheme()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const apiConfig = chatflow?.apiConfig ? JSON.parse(chatflow.apiConfig) : {}
    const overrideConfigStatus = apiConfig?.overrideConfig?.status !== undefined ? apiConfig.overrideConfig.status : false

    const codes = ['LangGraph', 'MS Framework (Semantic Kernel)']//['Embed', 'Python', 'JavaScript', 'cURL', 'Share Chatbot']
    const [value, setValue] = useState(0)
    const [apiKeys, setAPIKeys] = useState([])
    const [chatflowApiKeyId, setChatflowApiKeyId] = useState('')
    const [selectedApiKey, setSelectedApiKey] = useState({})
    const [selectedEnvironment, setSelectedEnvironment] = useState('dev')
    const [checkboxVal, setCheckbox] = useState(false)
    const [nodeConfig, setNodeConfig] = useState({})
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})
    const [nodeOverrides, setNodeOverrides] = useState(apiConfig?.overrideConfig?.nodes ?? null)
    const [variableOverrides, setVariableOverrides] = useState(apiConfig?.overrideConfig?.variables ?? [])

    const getAllAPIKeysApi = useApi(apiKeyApi.getAllAPIKeys)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getIsChatflowStreamingApi = useApi(chatflowsApi.getIsChatflowStreaming)
    const getConfigApi = useApi(configApi.getConfig)
    const getAllVariablesApi = useApi(variablesApi.getAllVariables)
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const { hasPermission } = useAuth()

    // Memoize keyOptions to prevent recreation on hover
    const keyOptions = useMemo(() => {
        if (!getAllAPIKeysApi.data) return []

        const options = [
            {
                label: 'No Authorization',
                name: ''
            }
        ]

        for (const key of getAllAPIKeysApi.data) {
            options.push({
                label: key.keyName,
                name: key.id
            })
        }

        if (isGlobal || hasPermission('apikeys:create')) {
            options.push({
                label: '- Add New Key -',
                name: 'addnewkey'
            })
        }

        return options
    }, [getAllAPIKeysApi.data, isGlobal, hasPermission])

    const onCheckBoxChanged = (newVal) => {
        setCheckbox(newVal)
        if (newVal) {
            getConfigApi.request(dialogProps.chatflowid)
            getAllVariablesApi.request()
        }
    }

    const onApiKeySelected = (keyValue) => {
        if (keyValue === 'addnewkey') {
            navigate('/apikey')
            return
        }
        setChatflowApiKeyId(keyValue)
        const selectedKey = apiKeys.find((key) => key.id === keyValue)
        setSelectedApiKey(selectedKey || {})
        const updateBody = {
            apikeyid: keyValue
        }
        updateChatflowApi.request(dialogProps.chatflowid, updateBody)
    }

    const groupByNodeLabel = (nodes) => {
        const result = {}
        const newNodeOverrides = {}
        const seenNodes = new Set()

        nodes.forEach((item) => {
            const { node, nodeId, label, name, type } = item
            seenNodes.add(node)

            if (!result[node]) {
                result[node] = {
                    nodeIds: [],
                    params: []
                }
            }

            if (!newNodeOverrides[node]) {
                // If overrideConfigStatus is true, copy existing config for this node
                newNodeOverrides[node] = overrideConfigStatus ? [...(nodeOverrides[node] || [])] : []
            }

            if (!result[node].nodeIds.includes(nodeId)) result[node].nodeIds.push(nodeId)

            const param = { label, name, type }

            if (!result[node].params.some((existingParam) => JSON.stringify(existingParam) === JSON.stringify(param))) {
                result[node].params.push(param)
                const paramExists = newNodeOverrides[node].some(
                    (existingParam) => existingParam.label === label && existingParam.name === name && existingParam.type === type
                )
                if (!paramExists) {
                    newNodeOverrides[node].push({ ...param, enabled: false })
                }
            }
        })

        // Sort the nodeIds array
        for (const node in result) {
            result[node].nodeIds.sort()
        }
        setNodeConfig(result)
        setNodeOverrides(newNodeOverrides)
    }

    const groupByVariableLabel = (variables) => {
        const newVariables = []
        const seenVariables = new Set()

        variables.forEach((item) => {
            const { id, name, type } = item
            seenVariables.add(id)

            const param = { id, name, type }

            // If overrideConfigStatus is true, look for existing variable config
            // Otherwise, create new default config
            if (overrideConfigStatus) {
                const existingVariable = variableOverrides?.find((existingParam) => existingParam.id === id)
                if (existingVariable) {
                    if (!newVariables.some((variable) => variable.id === id)) {
                        newVariables.push({ ...existingVariable })
                    }
                } else {
                    if (!newVariables.some((variable) => variable.id === id)) {
                        newVariables.push({ ...param, enabled: false })
                    }
                }
            } else {
                // When no override config exists, create default values
                if (!newVariables.some((variable) => variable.id === id)) {
                    newVariables.push({ ...param, enabled: false })
                }
            }
        })

        // If overrideConfigStatus is true, clean up any variables that no longer exist
        if (overrideConfigStatus && variableOverrides) {
            variableOverrides.forEach((existingVariable) => {
                if (!seenVariables.has(existingVariable.id)) {
                    const index = newVariables.findIndex((newVariable) => newVariable.id === existingVariable.id)
                    if (index !== -1) {
                        newVariables.splice(index, 1)
                    }
                }
            })
        }

        setVariableOverrides(newVariables)
    }

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
        }
    }, [updateChatflowApi.data, dispatch])

    useEffect(() => {
        if (getConfigApi.data) {
            groupByNodeLabel(getConfigApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getConfigApi.data])

    useEffect(() => {
        if (getAllVariablesApi.data) {
            groupByVariableLabel(getAllVariablesApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllVariablesApi.data])

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const getCode = (codeLang) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"

def query(payload):
    response = requests.post(API_URL, json=payload)
    return response.json()
    
output = query({
    "question": "Hey, how are you?",
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({"question": "Hey, how are you?"}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?"}' \\
     -H "Content-Type: application/json"`
        }
        return ''
    }

    const getCodeWithAuthorization = (codeLang) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()
    
output = query({
    "question": "Hey, how are you?",
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: {
                Authorization: "Bearer ${selectedApiKey?.apiKey}",
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({"question": "Hey, how are you?"}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?"}' \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"`
        }
        return ''
    }

    const getLang = (codeLang) => {
        if (codeLang === 'Python') {
            return 'python'
        } else if (codeLang === 'JavaScript') {
            return 'javascript'
        } else if (codeLang === 'cURL') {
            return 'bash'
        }
        return 'python'
    }

    const getSVG = (codeLang) => {
        if (codeLang === 'Python') {
            return pythonSVG
        } else if (codeLang === 'JavaScript') {
            return javascriptSVG
        } else if (codeLang === 'Embed') {
            return EmbedSVG
        } else if (codeLang === 'cURL') {
            return cURLSVG
        } else if (codeLang === 'Share Chatbot') {
            return ShareChatbotSVG
        } else if (codeLang === 'Configuration') {
            return settingsSVG
        } else if (codeLang === 'Langgraph') {
            return settingsSVG
        } else if (codeLang === 'MS Framework (Semantic Kernel)') {
            return settingsSVG
        }

        return pythonSVG
    }

    // ----------------------------CONFIG FORM DATA --------------------------//

    const getConfigCodeWithFormData = (codeLang, configData) => {
        if (codeLang === 'Python') {
            configData = unshiftFiles(configData)
            let fileType = configData[0].type
            if (fileType.includes(',')) fileType = fileType.split(',')[0]
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"

# use form data to upload files
form_data = {
    "files": ${`('example${fileType}', open('example${fileType}', 'rb'))`}
}
body_data = {${getConfigExamplesForPython(configData, 'formData')}}

def query(form_data):
    response = requests.post(API_URL, files=form_data, data=body_data)
    return response.json()

output = query(form_data)
`
        } else if (codeLang === 'JavaScript') {
            return `// use FormData to upload files
let formData = new FormData();
${getConfigExamplesForJS(configData, 'formData')}
async function query(formData) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            method: "POST",
            body: formData
        }
    );
    const result = await response.json();
    return result;
}

query(formData).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\${getConfigExamplesForCurl(configData, 'formData')} \\
     -H "Content-Type: multipart/form-data"`
        }
        return ''
    }

    // ----------------------------CONFIG FORM DATA with AUTH--------------------------//

    const getConfigCodeWithFormDataWithAuth = (codeLang, configData) => {
        if (codeLang === 'Python') {
            configData = unshiftFiles(configData)
            let fileType = configData[0].type
            if (fileType.includes(',')) fileType = fileType.split(',')[0]
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

# use form data to upload files
form_data = {
    "files": ${`('example${fileType}', open('example${fileType}', 'rb'))`}
}
body_data = {${getConfigExamplesForPython(configData, 'formData')}}

def query(form_data):
    response = requests.post(API_URL, headers=headers, files=form_data, data=body_data)
    return response.json()

output = query(form_data)
`
        } else if (codeLang === 'JavaScript') {
            return `// use FormData to upload files
let formData = new FormData();
${getConfigExamplesForJS(configData, 'formData')}
async function query(formData) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: { Authorization: "Bearer ${selectedApiKey?.apiKey}" },
            method: "POST",
            body: formData
        }
    );
    const result = await response.json();
    return result;
}

query(formData).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\${getConfigExamplesForCurl(configData, 'formData')} \\
     -H "Content-Type: multipart/form-data" \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"`
        }
        return ''
    }

    // ----------------------------CONFIG JSON--------------------------//

    const getConfigCode = (codeLang, configData) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"

def query(payload):
    response = requests.post(API_URL, json=payload)
    return response.json()

output = query({
    "question": "Hey, how are you?",
    "overrideConfig": {${getConfigExamplesForPython(configData, 'json')}
    }
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({
  "question": "Hey, how are you?",
  "overrideConfig": {${getConfigExamplesForJS(configData, 'json')}
  }
}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?", "overrideConfig": {${getConfigExamplesForCurl(configData, 'json')}}' \\
     -H "Content-Type: application/json"`
        }
        return ''
    }

    // ----------------------------CONFIG JSON with AUTH--------------------------//

    const getConfigCodeWithAuthorization = (codeLang, configData) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()

output = query({
    "question": "Hey, how are you?",
    "overrideConfig": {${getConfigExamplesForPython(configData, 'json')}
    }
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: {
                Authorization: "Bearer ${selectedApiKey?.apiKey}",
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({
  "question": "Hey, how are you?",
  "overrideConfig": {${getConfigExamplesForJS(configData, 'json')}
  }
}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?", "overrideConfig": {${getConfigExamplesForCurl(configData, 'json')}}' \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"`
        }
        return ''
    }

    const getMultiConfigCodeWithFormData = (codeLang) => {
        if (dialogProps.isAgentflowV2) {
            if (codeLang === 'Python') {
                return `# Specify multiple values for a config parameter by specifying the node id
body_data = {
    "agentModelConfig": {
        "agentAgentflow_0": {
            "openAIApiKey": "sk-my-openai-1st-key"
        },
        "agentAgentflow_1": {
            "openAIApiKey": "sk-my-openai-2nd-key"
        }
    }
}`
            } else if (codeLang === 'JavaScript') {
                return `// Specify multiple values for a config parameter by specifying the node id
formData.append("agentModelConfig[agentAgentflow_0][openAIApiKey]", "sk-my-openai-1st-key")
formData.append("agentModelConfig[agentAgentflow_1][openAIApiKey]", "sk-my-openai-2nd-key")`
            } else if (codeLang === 'cURL') {
                return `-F "agentModelConfig[agentAgentflow_0][openAIApiKey]=sk-my-openai-1st-key" \\
-F "agentModelConfig[agentAgentflow_1][openAIApiKey]=sk-my-openai-2nd-key" \\`
            }
        } else {
            if (codeLang === 'Python') {
                return `# Specify multiple values for a config parameter by specifying the node id
body_data = {
    "openAIApiKey": {
        "chatOpenAI_0": "sk-my-openai-1st-key",
        "openAIEmbeddings_0": "sk-my-openai-2nd-key"
    }
}`
            } else if (codeLang === 'JavaScript') {
                return `// Specify multiple values for a config parameter by specifying the node id
formData.append("openAIApiKey[chatOpenAI_0]", "sk-my-openai-1st-key")
formData.append("openAIApiKey[openAIEmbeddings_0]", "sk-my-openai-2nd-key")`
            } else if (codeLang === 'cURL') {
                return `-F "openAIApiKey[chatOpenAI_0]=sk-my-openai-1st-key" \\
-F "openAIApiKey[openAIEmbeddings_0]=sk-my-openai-2nd-key" \\`
            }
        }
    }

    const getMultiConfigCode = () => {
        if (dialogProps.isAgentflowV2) {
            return `{
    "overrideConfig": {
        "agentModelConfig": {
            "agentAgentflow_0": {
                "openAIApiKey": "sk-my-openai-1st-key"
            },
            "agentAgentflow_1": {
                "openAIApiKey": "sk-my-openai-2nd-key"
            }
        }
    }
}`
        } else {
            return `{
    "overrideConfig": {
        "openAIApiKey": {
            "chatOpenAI_0": "sk-my-openai-1st-key",
            "openAIEmbeddings_0": "sk-my-openai-2nd-key"
        }
    }
}`
        }
    }

    const getLanggraphCode = () => {
        return `
# =========================
# LangGraph Demo Workflow
# Email -> Digitize -> Extract -> Excel
# =========================

from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, START, END
import pandas as pd

# -------------------------
# STATE DEFINITION
# -------------------------
class AgentState(TypedDict):
    emails: List[dict]
    selected_email: Optional[dict]
    digitized_text: Optional[str]
    extracted_data: Optional[dict]
    excel_path: Optional[str]

# -------------------------
# OUTLOOK TOOL (MOCK)
# -------------------------
def list_outlook_emails(state: AgentState):
    print("📧 Fetching emails from Outlook...")
    emails = [
        {
            "id": "email_1",
            "subject": "KYC Document",
            "has_attachment": True,
            "attachment_url": "https://mock/file.pdf"
        },
        {
            "id": "email_2",
            "subject": "Hello",
            "has_attachment": False
        }
    ]
    return {"emails": emails}

# -------------------------
# FILTER EMAIL WITH ATTACHMENT
# -------------------------
def select_email(state: AgentState):
    print("🔍 Selecting email with attachment...")
    for email in state["emails"]:
        if email.get("has_attachment"):
            return {"selected_email": email}
    return {"selected_email": None}

# -------------------------
# DECISION NODE
# -------------------------
def should_digitize(state: AgentState):
    email = state["selected_email"]

    if email and email.get("has_attachment"):
        print("✅ Attachment found → Proceeding")
        return "digitize"

    print("❌ No attachment → Stopping flow")
    return "stop"

# -------------------------
# DIGITIZATION (MOCK HTTP)
# -------------------------
def digitize_document(state: AgentState):
    print("📄 Digitizing document...")
    digitized_text = """
    First Name: John
    Last Name: Doe
    Email: john.doe@example.com
    """
    return {"digitized_text": digitized_text}

# -------------------------
# EXTRACTION (MOCK HTTP)
# -------------------------
def extract_data(state: AgentState):
    print("🧠 Extracting structured data...")
    extracted = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com"
    }
    return {"extracted_data": extracted}

# -------------------------
# EXCEL GENERATION TOOL
# -------------------------
def generate_excel(state: AgentState):
    print("📊 Generating Excel file...")
    df = pd.DataFrame([state["extracted_data"]])
    path = "output.xlsx"
    df.to_excel(path, index=False)
    print(f"✅ Excel saved as {path}")
    return {"excel_path": path}

# -------------------------
# BUILD GRAPH
# -------------------------
graph = StateGraph(AgentState)

graph.add_node("list_emails", list_outlook_emails)
graph.add_node("select_email", select_email)
graph.add_node("digitize", digitize_document)
graph.add_node("extract", extract_data)
graph.add_node("excel", generate_excel)

graph.add_edge(START, "list_emails")
graph.add_edge("list_emails", "select_email")

graph.add_conditional_edges(
    "select_email",
    should_digitize,
    {
        "digitize": "digitize",
        "stop": END
    }
)

graph.add_edge("digitize", "extract")
graph.add_edge("extract", "excel")
graph.add_edge("excel", END)

app = graph.compile()

# -------------------------
# RUN
# -------------------------
if __name__ == "__main__":
    final_state = app.invoke({})
    print("\n🎯 FINAL STATE")
    print(final_state)

        `
    }

    const getMSFrameworkCode = () => {
        return `
# =========================
# Microsoft Agent Style Flow
# Email -> Digitize -> Extract -> Excel
# =========================

import pandas as pd

# -------------------------
# OUTLOOK SKILL (MOCK)
# -------------------------
class OutlookSkill:
    def list_emails(self):
        print("📧 Fetching emails from Outlook...")
        return [
            {
                "subject": "KYC Document",
                "has_attachment": True,
                "attachment_url": "https://mock/file.pdf"
            },
            {
                "subject": "Random Mail",
                "has_attachment": False
            }
        ]

# -------------------------
# DIGITIZATION SKILL
# -------------------------
class DigitizationSkill:
    def digitize(self, file_url: str):
        print("📄 Digitizing document...")
        return """
        First Name: John
        Last Name: Doe
        Email: john.doe@example.com
        """

# -------------------------
# EXTRACTION SKILL
# -------------------------
class ExtractionSkill:
    def extract(self, text: str):
        print("🧠 Extracting structured data...")
        return {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com"
        }

# -------------------------
# EXCEL SKILL
# -------------------------
class ExcelSkill:
    def generate(self, data: dict):
        print("📊 Generating Excel file...")
        df = pd.DataFrame([data])
        path = "output.xlsx"
        df.to_excel(path, index=False)
        print(f"✅ Excel saved as {path}")
        return path

# -------------------------
# ORCHESTRATION
# -------------------------
def run_agent():
    outlook = OutlookSkill()
    digitizer = DigitizationSkill()
    extractor = ExtractionSkill()
    excel = ExcelSkill()

    emails = outlook.list_emails()

    for email in emails:
        if not email["has_attachment"]:
            print("⏭️ Skipping email (no attachment)")
            continue

        print("✅ Attachment found → Proceeding")

        text = digitizer.digitize(email["attachment_url"])
        data = extractor.extract(text)
        excel.generate(data)

# -------------------------
# RUN
# -------------------------
if __name__ == "__main__":
    run_agent()

        `
    }

    useEffect(() => {
        if (getAllAPIKeysApi.data) {
            setAPIKeys(getAllAPIKeysApi.data)

            if (dialogProps.chatflowApiKeyId) {
                setChatflowApiKeyId(dialogProps.chatflowApiKeyId)
                setSelectedApiKey(getAllAPIKeysApi.data.find((key) => key.id === dialogProps.chatflowApiKeyId))
            }
        }
    }, [dialogProps, getAllAPIKeysApi.data])

    useEffect(() => {
        if (show) {
            getAllAPIKeysApi.request()
            getIsChatflowStreamingApi.request(dialogProps.chatflowid)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='md'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ flex: 80 }}>
                        <Tabs value={value} onChange={handleChange} aria-label='tabs'>
                            {codes.map((codeLang, index) => (
                                <Tab
                                    icon={
                                        <img style={{ objectFit: 'cover', height: 15, width: 'auto' }} src={getSVG(codeLang)} alt='code' />
                                    }
                                    iconPosition='start'
                                    key={index}
                                    label={codeLang}
                                    {...a11yProps(index)}
                                ></Tab>
                            ))}
                        </Tabs>
                    </div>
                    {/* <div style={{ flex: 20 }}>
                        <Available permission={'chatflows:update,agentflows:update'}>
                            <Dropdown
                                name='SelectKey'
                                disableClearable={true}
                                options={keyOptions}
                                onSelect={(newValue) => onApiKeySelected(newValue)}
                                value={dialogProps.chatflowApiKeyId ?? chatflowApiKeyId ?? 'Choose an API key'}
                            />
                        </Available>
                    </div> */}
                </div>
                <div style={{ marginTop: 10 }}></div>
                {codes.map((codeLang, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {/* {(codeLang === 'Embed' || codeLang === 'Share Chatbot') && chatflowApiKeyId && (
                            <>
                                <p>You cannot use API key while embedding/sharing chatbot.</p>
                                <p>
                                    Please select <b>&quot;No Authorization&quot;</b> from the dropdown at the top right corner.
                                </p>
                            </>
                        )} */}
                        {/* {codeLang === 'Embed' && !chatflowApiKeyId && <EmbedChat chatflowid={dialogProps.chatflowid} />} */}
                        {/* {codeLang !== 'Embed' && codeLang !== 'Share Chatbot' && codeLang !== 'Configuration' && (
                            <>
                                <CopyBlock
                                    theme={atomOneDark}
                                    text={chatflowApiKeyId ? getCodeWithAuthorization(codeLang) : getCode(codeLang)}
                                    language={getLang(codeLang)}
                                    showLineNumbers={false}
                                    wrapLines
                                />
                                <CheckboxInput label='Show Override Config' value={checkboxVal} onChange={onCheckBoxChanged} />
                                {checkboxVal && getConfigApi.data && getConfigApi.data.length > 0 && (
                                    <>
                                        <Typography sx={{ mt: 2 }}>
                                            You can override existing input configuration of the chatflow with overrideConfig property.
                                        </Typography>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                borderRadius: 10,
                                                background: 'rgb(254,252,191)',
                                                padding: 10,
                                                marginTop: 10,
                                                marginBottom: 10
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <IconExclamationCircle size={30} color='rgb(116,66,16)' />
                                                <span style={{ color: 'rgb(116,66,16)', marginLeft: 10, fontWeight: 500 }}>
                                                    {
                                                        'For security reason, override config is disabled by default. You can change this by going into Chatflow Configuration -> Security tab, and enable the property you want to override.'
                                                    }
                                                    &nbsp;Refer{' '}
                                                    <a
                                                        rel='noreferrer'
                                                        target='_blank'
                                                        href='https://docs.flowiseai.com/using-flowise/prediction#configuration-override'
                                                    >
                                                        here
                                                    </a>{' '}
                                                    for more details
                                                </span>
                                            </div>
                                        </div>
                                        <Stack direction='column' spacing={2} sx={{ width: '100%', my: 2 }}>
                                            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 2 }} variant='outlined'>
                                                <Stack sx={{ mt: 1, mb: 2, ml: 1, alignItems: 'center' }} direction='row' spacing={2}>
                                                    <IconBox />
                                                    <Typography variant='h4'>Nodes</Typography>
                                                </Stack>
                                                {Object.keys(nodeConfig)
                                                    .sort()
                                                    .map((nodeLabel) => (
                                                        <Accordion
                                                            expanded={nodeConfigExpanded[nodeLabel] || false}
                                                            onChange={handleAccordionChange(nodeLabel)}
                                                            key={nodeLabel}
                                                            disableGutters
                                                        >
                                                            <AccordionSummary
                                                                expandIcon={<ExpandMoreIcon />}
                                                                aria-controls={`nodes-accordian-${nodeLabel}`}
                                                                id={`nodes-accordian-header-${nodeLabel}`}
                                                            >
                                                                <Stack
                                                                    flexDirection='row'
                                                                    sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
                                                                >
                                                                    <Typography variant='h5'>{nodeLabel}</Typography>
                                                                    {nodeConfig[nodeLabel].nodeIds.length > 0 &&
                                                                        nodeConfig[nodeLabel].nodeIds.map((nodeId, index) => (
                                                                            <div
                                                                                key={index}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    flexDirection: 'row',
                                                                                    width: 'max-content',
                                                                                    borderRadius: 15,
                                                                                    background: 'rgb(254,252,191)',
                                                                                    padding: 5,
                                                                                    paddingLeft: 10,
                                                                                    paddingRight: 10
                                                                                }}
                                                                            >
                                                                                <span
                                                                                    style={{
                                                                                        color: 'rgb(116,66,16)',
                                                                                        fontSize: '0.825rem'
                                                                                    }}
                                                                                >
                                                                                    {nodeId}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                </Stack>
                                                            </AccordionSummary>
                                                            <AccordionDetails>
                                                                <TableViewOnly
                                                                    rows={nodeOverrides[nodeLabel]}
                                                                    columns={
                                                                        nodeOverrides[nodeLabel].length > 0
                                                                            ? Object.keys(nodeOverrides[nodeLabel][0]).filter(
                                                                                (key) => key !== 'schema'
                                                                            )
                                                                            : []
                                                                    }
                                                                />
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    ))}
                                            </Card>
                                            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 2 }} variant='outlined'>
                                                <Stack sx={{ mt: 1, mb: 2, ml: 1, alignItems: 'center' }} direction='row' spacing={2}>
                                                    <IconVariable />
                                                    <Typography variant='h4'>Variables</Typography>
                                                </Stack>
                                                <TableViewOnly rows={variableOverrides} columns={['name', 'type', 'enabled']} />
                                            </Card>
                                        </Stack>
                                        <CopyBlock
                                            theme={atomOneDark}
                                            text={
                                                chatflowApiKeyId
                                                    ? dialogProps.isFormDataRequired
                                                        ? getConfigCodeWithFormDataWithAuth(codeLang, getConfigApi.data)
                                                        : getConfigCodeWithAuthorization(codeLang, getConfigApi.data)
                                                    : dialogProps.isFormDataRequired
                                                        ? getConfigCodeWithFormData(codeLang, getConfigApi.data)
                                                        : getConfigCode(codeLang, getConfigApi.data)
                                            }
                                            language={getLang(codeLang)}
                                            showLineNumbers={false}
                                            wrapLines
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                borderRadius: 10,
                                                background: '#d8f3dc',
                                                padding: 10,
                                                marginTop: 10,
                                                marginBottom: 10
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <IconBulb size={30} color='#2d6a4f' />
                                                <span style={{ color: '#2d6a4f', marginLeft: 10, fontWeight: 500 }}>
                                                    You can also specify multiple values for a config parameter by specifying the node id
                                                </span>
                                            </div>
                                            <div style={{ padding: 10 }}>
                                                <CopyBlock
                                                    theme={atomOneDark}
                                                    text={
                                                        dialogProps.isFormDataRequired
                                                            ? getMultiConfigCodeWithFormData(codeLang)
                                                            : getMultiConfigCode()
                                                    }
                                                    language={getLang(codeLang)}
                                                    showLineNumbers={false}
                                                    wrapLines
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {getIsChatflowStreamingApi.data?.isStreaming && (
                                    <p>
                                        Read&nbsp;
                                        <a rel='noreferrer' target='_blank' href='https://docs.flowiseai.com/using-flowise/streaming'>
                                            here
                                        </a>
                                        &nbsp;on how to stream response back to application
                                    </p>
                                )}
                            </>
                        )} */}
                        {/* {codeLang === 'Share Chatbot' && !chatflowApiKeyId && (
                            <ShareChatbot isSessionMemory={dialogProps.isSessionMemory} isAgentCanvas={dialogProps.isAgentCanvas} />
                        )} */}
                        {codeLang === 'LangGraph' && !chatflowApiKeyId && (
                            <Box sx={{ maxHeight: '55vh', overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                                <CopyBlock theme={atomOneDark} text={getLanggraphCode()} language='javascript' showLineNumbers={false} wrapLines />
                            </Box>
                        )}
                        {codeLang === 'MS Framework (Semantic Kernel)' && !chatflowApiKeyId && (
                            <Box sx={{ maxHeight: '60vh', overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                                <CopyBlock theme={atomOneDark} text={getMSFrameworkCode()} language='javascript' showLineNumbers={false} wrapLines />
                            </Box>
                        )}
                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Stack direction='row' spacing={2} alignItems='center'>
                                <Dropdown
                                    name='Environment'
                                    disableClearable={true}
                                    options={[
                                        { label: 'Dev', name: 'dev' },
                                        { label: 'UAT', name: 'uat' },
                                        { label: 'Prod', name: 'prod' }
                                    ]}
                                    onSelect={(newValue) => setSelectedEnvironment(newValue)}
                                    value={selectedEnvironment}
                                />
                                <Button
                                    variant='contained'
                                    color='primary'
                                    onClick={() => {
                                        console.log(`Deploying to ${selectedEnvironment} environment...`)
                                        // Dummy deploy functionality
                                        alert(`Deploying to ${selectedEnvironment.toUpperCase()} environment...`)
                                    }}
                                >
                                    Deploy
                                </Button>
                            </Stack>
                        </Box>

                    </TabPanel>
                ))}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

APICodeDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default APICodeDialog
