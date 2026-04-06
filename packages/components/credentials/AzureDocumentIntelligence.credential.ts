import { INodeParams, INodeCredential } from '../src/Interface'

class AzureDocumentIntelligence implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure AI Document Intelligence'
        this.name = 'azureDocumentIntelligence'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Azure Document Intelligence Key',
                name: 'azureDocumentIntelligenceKey',
                type: 'password',
                description: 'API key from your Azure AI Document Intelligence resource (Keys and Endpoint in Azure Portal)'
            },
            {
                label: 'Azure Document Intelligence Endpoint',
                name: 'azureDocumentIntelligenceEndpoint',
                type: 'string',
                description:
                    'Resource endpoint URL, e.g. https://your-resource.cognitiveservices.azure.com/ (include trailing slash or omit; both work)',
                placeholder: 'https://your-resource.cognitiveservices.azure.com/'
            },
            {
                label: 'API Version',
                name: 'apiVersion',
                type: 'string',
                description: 'REST API version for Document Intelligence (see Azure docs for supported versions)',
                placeholder: '2024-11-30',
                default: '2024-11-30'
            }
        ]
    }
}

module.exports = { credClass: AzureDocumentIntelligence }
