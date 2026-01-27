// Dev mode entry point - uses ts-node to run server directly
import * as Server from './index'
import * as DataSource from './DataSource'
import logger from './utils/logger'

async function main() {
    try {
        logger.info('Starting Flowise in development mode...')
        await DataSource.init()
        await Server.start()
    } catch (error) {
        logger.error('Error starting Flowise:', error)
        process.exit(1)
    }
}

main()
