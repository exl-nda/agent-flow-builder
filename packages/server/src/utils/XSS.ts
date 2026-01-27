import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'
import { isPredictionRequest, extractChatflowId, validateChatflowDomain } from './domainValidation'

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
    // decoding is necessary as the url is encoded by the browser
    const decodedURI = decodeURI(req.url)
    req.url = sanitizeHtml(decodedURI)
    for (let p in req.query) {
        if (Array.isArray(req.query[p])) {
            const sanitizedQ = []
            for (const q of req.query[p] as string[]) {
                sanitizedQ.push(sanitizeHtml(q))
            }
            req.query[p] = sanitizedQ
        } else {
            req.query[p] = sanitizeHtml(req.query[p] as string)
        }
    }
    next()
}

export function getAllowedCorsOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing.
    const corsOrigins = process.env.CORS_ORIGINS ?? ''

    // In development, if CORS_ORIGINS is not set, allow localhost origins by default
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
    if (!corsOrigins && isDevelopment) {
        return 'http://localhost:8080,http://localhost:3000,http://127.0.0.1:8080,http://127.0.0.1:3000'
    }

    return corsOrigins
}

function parseAllowedOrigins(allowedOrigins: string): { lower: string[]; original: string[] } {
    if (!allowedOrigins) {
        return { lower: [], original: [] }
    }
    if (allowedOrigins === '*') {
        return { lower: ['*'], original: ['*'] }
    }
    const origins = allowedOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    return {
        lower: origins.map((origin) => origin.toLowerCase()),
        original: origins
    }
}

export function getCorsOptions(): any {
    return (req: any, callback: (err: Error | null, options?: any) => void) => {
        const corsOptions = {
            credentials: true, // CRITICAL: Must be true when using withCredentials in client
            origin: (origin: string | undefined, originCallback: (err: Error | null, allow?: boolean | string) => void) => {
                const allowedOrigins = getAllowedCorsOrigins()
                const isPredictionReq = isPredictionRequest(req.url)
                const { lower: allowedListLower, original: allowedListOriginal } = parseAllowedOrigins(allowedOrigins)
                const originLc = origin?.toLowerCase()

                // Always allow no-Origin requests (same-origin, server-to-server)
                if (!originLc) return originCallback(null, true)

                // When credentials are enabled, '*' is not allowed - must return exact origin
                if (allowedOrigins === '*') {
                    // In development, allow localhost origins and return exact origin
                    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
                    if (isDevelopment) {
                        const localhostOrigins = ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080', 'http://127.0.0.1:3000']
                        if (originLc && localhostOrigins.some(lo => lo.toLowerCase() === originLc)) {
                            // Return exact origin (not '*') so credentials work
                            const matchedOrigin = localhostOrigins.find(lo => lo.toLowerCase() === originLc) || origin
                            return originCallback(null, matchedOrigin)
                        }
                    }
                    // In production with '*', deny if credentials are required
                    return originCallback(null, false)
                }

                // Find matching origin (case-insensitive)
                const originIndex = allowedListLower.indexOf(originLc)
                const globallyAllowed = originIndex !== -1

                if (isPredictionReq) {
                    // For prediction requests, we need async validation
                    // But for now, allow if globally allowed
                    // The actual domain validation happens in the route handler
                    if (globallyAllowed) {
                        const matchedOrigin = allowedListOriginal[originIndex] || origin
                        return originCallback(null, matchedOrigin)
                    }
                    return originCallback(null, false)
                }

                // Non-prediction: return exact origin when allowing
                if (globallyAllowed) {
                    // Return exact origin string (not just true) so CORS sets header correctly
                    const matchedOrigin = allowedListOriginal[originIndex] || origin
                    return originCallback(null, matchedOrigin)
                }
                return originCallback(null, false)
            }
        }
        callback(null, corsOptions)
    }
}

export function getAllowedIframeOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing or * for all.
    // Also CSP allowed values: self or none
    return process.env.IFRAME_ORIGINS ?? '*'
}
