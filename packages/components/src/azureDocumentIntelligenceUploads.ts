import { ICommonObject, IFileUpload } from './Interface'
import { getFileFromStorage } from './storageUtils'

/**
 * Returns the first uploaded PDF (by mime or .pdf name) as bytes from Flowise storage.
 */
export async function getFirstPdfBufferFromUploads(options: ICommonObject): Promise<{ buffer: Buffer; fileName: string } | null> {
    const uploads = options.uploads as IFileUpload[] | undefined
    if (!uploads?.length) return null

    const pdf = uploads.find((u) => u.mime === 'application/pdf' || u.name?.toLowerCase().endsWith('.pdf'))
    if (!pdf?.name) return null

    let rawName = pdf.name.replace(/^FILE-STORAGE::/, '')
    let fileName = rawName
    if (rawName.startsWith('[') && rawName.endsWith(']')) {
        const files = JSON.parse(rawName) as string[]
        fileName = files[0] ?? ''
    }
    if (!fileName) return null

    const orgId = options.orgId as string
    const chatflowid = options.chatflowid as string
    const chatId = options.chatId as string
    const paths = chatId ? [orgId, chatflowid, chatId] : [orgId, chatflowid]
    const buffer = await getFileFromStorage(fileName, ...paths)
    return { buffer, fileName }
}
