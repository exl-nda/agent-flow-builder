import logo from '@/assets/images/flowise_white.svg'
import logoDark from '@/assets/images/flowise_dark.svg'
import logoMcKesson from '@/assets/images/MckLogo.svg'
import logoExl from '@/assets/images/exl.png'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <img
                style={{ objectFit: 'contain', height: 38, width: 'auto' }}
                src={customization.isDarkMode ? logoExl : logoExl}
                alt='Flowise'
            />
        </div>
    )
}

export default Logo
