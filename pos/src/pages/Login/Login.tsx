import { useState, useRef, useCallback, useEffect, type ChangeEvent, type FormEvent } from 'react'
import styles from './Login.module.css'
import ScaleWrapper from '@/components/ScaleWrapper/ScaleWrapper'
import LoginError from '@/components/LoginError'
import Numpad from '@/components/Numpad'
import SessionErrorModal from '@/components/SessionErrorModal'
import { usePOSConnectionContext } from '@/contexts/POSConnectionContext'
import { useSkin } from '@/contexts/SkinContext'

// Assets
import clearButtonSvg from '@/assets/login/butt_rot_x.svg'
import loginButtonSvg from '@/assets/login/butt_login.svg'
import dsLogoImg from '@/assets/images/ds_logo_login.png'
import gamesImg from '@/assets/images/games_img.webp'

// Web-skin login background: seamless B/W greyhound-race loop (served from public/)
const webBgVideo = `${import.meta.env.BASE_URL}login-race.mp4`
const webBgPoster = `${import.meta.env.BASE_URL}login-race-poster.jpg`

// Types
interface LoginFormData {
  operatorId: string
  password: string
}

interface LoginProps {
  onLogin?: () => void
  onLoginFailed?: () => void
}

// Format operator ID: xxx-xxx-xxx-xxx (only digits, auto-hyphen)
const formatOperatorId = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')
  // Limit to 12 digits
  const limited = digits.slice(0, 12)
  // Add hyphens after every 3 digits
  const parts = limited.match(/.{1,3}/g) || []
  return parts.join('-')
}

// Main Login Component
export default function Login({ onLogin, onLoginFailed }: LoginProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    operatorId: '',
    password: ''
  })
  const [activeField, setActiveField] = useState<'operatorId' | 'password'>('operatorId')
  const [loginErrorMessage, setLoginErrorMessage] = useState('')
  const [showLoginError, setShowLoginError] = useState(false)

  const operatorInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  // 'web' skin (modern) uses a clean card login (like tvbox-online); the
  // classic skin keeps the original image-based login + on-screen numpad.
  const { skin } = useSkin()

  // POS Connection from Context
  const {
    connectionState,
    isInitializing,
    isLoggingIn,
    deviceId,
    locationName,
    deviceError,
    activeSessionDetails,
    loginError,
    errorMessage,
    initialize,
    login,
    clearErrors
  } = usePOSConnectionContext()

  // Initialize connection on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Handle login errors from hook - use ref to track previous state
  const prevLoginErrorRef = useRef(loginError)
  useEffect(() => {
    if (loginError && errorMessage && !prevLoginErrorRef.current) {
      setLoginErrorMessage(errorMessage)
      setShowLoginError(true)
    }
    prevLoginErrorRef.current = loginError
  }, [loginError, errorMessage])

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === 'operatorId') {
      // Only allow digits, auto-format with hyphens
      const formatted = formatOperatorId(value)
      setFormData(prev => ({ ...prev, operatorId: formatted }))
      // Auto-focus password when operatorId is complete (12 digits)
      const digits = value.replace(/\D/g, '')
      if (digits.length >= 12) {
        setTimeout(() => {
          setActiveField('password')
          passwordInputRef.current?.focus()
        }, 50)
      }
    } else {
      // Password field - keep existing behavior
      if (value.length <= 15) {
        setFormData(prev => ({ ...prev, [name]: value }))
      }
    }
  }, [])

  const handleNumpadNumber = useCallback((num: string) => {
    setFormData(prev => {
      if (activeField === 'operatorId') {
        // Format with hyphens, limit to 12 digits (15 chars with hyphens)
        const currentDigits = prev.operatorId.replace(/\D/g, '')
        if (currentDigits.length < 12) {
          const newDigits = currentDigits + num
          const newValue = formatOperatorId(newDigits)
          // Auto-focus password when operatorId is complete (12 digits)
          if (newDigits.length === 12) {
            setTimeout(() => {
              setActiveField('password')
              passwordInputRef.current?.focus()
            }, 50)
          }
          return { ...prev, operatorId: newValue }
        }
        return prev
      } else {
        // Password field
        const currentValue = prev[activeField]
        if (currentValue.length < 15) {
          return { ...prev, [activeField]: currentValue + num }
        }
        return prev
      }
    })
  }, [activeField])

  const handleNumpadDelete = useCallback(() => {
    setFormData(prev => {
      if (activeField === 'operatorId') {
        // Remove last digit and reformat
        const currentDigits = prev.operatorId.replace(/\D/g, '')
        const newDigits = currentDigits.slice(0, -1)
        return { ...prev, operatorId: formatOperatorId(newDigits) }
      } else {
        return { ...prev, [activeField]: prev[activeField].slice(0, -1) }
      }
    })
  }, [activeField])

  const handleClear = useCallback((field: 'operatorId' | 'password') => {
    setFormData(prev => ({ ...prev, [field]: '' }))
    setActiveField(field)
    const inputRef = field === 'operatorId' ? operatorInputRef : passwordInputRef
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault()

    // Clear previous errors
    clearErrors()
    setShowLoginError(false)

    // Check if connected
    if (connectionState !== 'ready') {
      setLoginErrorMessage('Connecting to server...')
      setShowLoginError(true)
      return
    }

    console.log('Login attempt:', { operatorId: formData.operatorId })

    // Show loading overlay immediately (before awaiting server)
    onLogin?.()

    // Attempt login via WebSocket
    const success = await login(formData.operatorId, formData.password)

    if (!success) {
      // Login failed — go back to login view (error messages already set by login())
      onLoginFailed?.()
    }
  }, [formData, connectionState, login, clearErrors, onLogin, onLoginFailed])

  const handleLoginErrorHide = useCallback(() => {
    setShowLoginError(false)
  }, [])

  const handleDeviceErrorClose = useCallback(() => {
    // Clear error and retry initialization
    clearErrors()
    initialize()
  }, [clearErrors, initialize])

  // Map deviceError to SessionErrorModal type
  const getDeviceErrorType = (): 'DEVICE_IN_USE' | 'DEVICE_NOT_FOUND' | 'DEVICE_NOT_CONFIGURED' | undefined => {
    if (deviceError === 'DEVICE_IN_USE') return 'DEVICE_IN_USE'
    if (deviceError === 'DEVICE_NOT_FOUND') return 'DEVICE_NOT_FOUND'
    if (deviceError === 'DEVICE_NOT_CONFIGURED') return 'DEVICE_NOT_CONFIGURED'
    return undefined
  }

  // Show loading state during initialization
  const isFormDisabled = isInitializing || isLoggingIn || connectionState === 'connecting' || connectionState === 'deviceLogin'

  // Offline = no internet at all. Show message + auto-retry (already armed in hook).
  const isOffline = deviceError === 'OFFLINE' || deviceError === 'NETWORK_ERROR'
  const isWaitingPrevSession = deviceError === 'DEVICE_IN_USE_RETRYING'

  // Get status text for display (only for loading states and ready)
  const getStatusText = () => {
    if (isOffline) return 'Sin conexión a internet — reconectando...'
    if (isWaitingPrevSession) return 'Esperando cierre de sesión anterior...'
    if (isInitializing || connectionState === 'connecting') return 'Conectando...'
    if (connectionState === 'deviceLogin') return 'Validando dispositivo...'
    if (connectionState === 'ready') return locationName || ''
    if (connectionState === 'reconnecting') return 'Reconectando...'
    return ''
  }

  // Show status bar only during loading or when location is available
  const showStatusBar = isOffline || isWaitingPrevSession || isInitializing ||
    connectionState === 'connecting' || connectionState === 'deviceLogin' ||
    connectionState === 'reconnecting' ||
    (connectionState === 'ready' && locationName)

  return (
    <ScaleWrapper>
      <div className={styles.loginBg}>
        {/* Status Bar */}
        {showStatusBar && (
          <div className={styles.statusBar}>
            <span className={styles.statusText}>{getStatusText()}</span>
          </div>
        )}

        {/* ── Classic skin: original image-based login + numpad ────────── */}
        {skin !== 'web' && (<>
        {/* Login Form */}
        <form className={styles.loginForm} onSubmit={handleSubmit} autoComplete="off">
          <div className={styles.loginCont}>
            {/* Operator ID */}
            <div className={styles.loginElem}>
              <div className={styles.loginInput}>
                <div className={styles.loginInputField}>
                  <input
                    ref={operatorInputRef}
                    type="text"
                    name="operatorId"
                    placeholder="ID DE OPERADOR"
                    value={formData.operatorId}
                    onChange={handleInputChange}
                    onFocus={() => setActiveField('operatorId')}
                    disabled={isFormDisabled}
                    autoFocus
                    autoComplete="off"
                    maxLength={15}
                  />
                  <div className={styles.inpBack} />
                </div>
                <img
                  src={clearButtonSvg}
                  className={styles.clearButton}
                  alt="clear"
                  onClick={() => handleClear('operatorId')}
                />
              </div>
            </div>

            {/* Password + Login Button */}
            <div className={styles.loginElem}>
              <div className={styles.loginInput}>
                <div className={styles.loginInputField}>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    name="password"
                    placeholder="CONTRASENA"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => setActiveField('password')}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isFormDisabled) handleSubmit() }}
                    disabled={isFormDisabled}
                    autoComplete="off"
                  />
                  <div className={styles.inpBack} />
                </div>
                <img
                  src={clearButtonSvg}
                  className={styles.clearButton}
                  alt="clear"
                  onClick={() => handleClear('password')}
                />
              </div>
              <div className={styles.loginInput}>
                <div
                  className={`${styles.loginInputField} ${styles.loginButton} ${isFormDisabled ? styles.loginButtonDisabled : ''}`}
                  onClick={() => !isFormDisabled && handleSubmit()}
                >
                  <span className={styles.loginButtonText}>
                    {isLoggingIn ? 'ACCEDIENDO...' : 'ACCESO'}
                  </span>
                  <img src={loginButtonSvg} alt="login" />
                  <div className={styles.loginButtonHov} />
                </div>
                {/* Error Message - below login button */}
                <LoginError
                  message={loginErrorMessage}
                  visible={showLoginError}
                  duration={3000}
                  onHide={handleLoginErrorHide}
                />
              </div>
            </div>

            {/* Numpad */}
            <div className={`${styles.loginElem} ${styles.numPadCont}`}>
              <div className={styles.numPadIcon}>
                <Numpad
                  onNumberClick={handleNumpadNumber}
                  onDelete={handleNumpadDelete}
                  disabled={isFormDisabled}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Background Images */}
        <div className={styles.gamesImgContainer}>
          <img className={styles.dsLogo} src={dsLogoImg} alt="DS Logo" />
          <img className={styles.gamesImg} src={gamesImg} alt="Games" />
        </div>

        {/* Version */}
        <div className={styles.version}>2.60.05</div>
        </>)}

        {/* ── Web skin (modern): clean card login, keyboard-driven ──────── */}
        {skin === 'web' && (<>
          {/* Motion background: seamless B/W race loop, blurred behind the card.
              Played in slow motion for a calmer, cinematic feel. */}
          <video
            className={styles.webBgVideo}
            ref={(v) => { if (v) v.playbackRate = 0.45 }}
            autoPlay
            muted
            loop
            playsInline
            poster={webBgPoster}
            aria-hidden="true"
          >
            <source src={webBgVideo} type="video/mp4" />
          </video>
          <div className={styles.webBgOverlay} aria-hidden="true" />
          <div className={styles.webLogin}>
            <form className={styles.webCard} onSubmit={handleSubmit} autoComplete="off">
              <h1 className={styles.webTitle}>{locationName || 'ACCESO'}</h1>
              <input
                ref={operatorInputRef}
                className={styles.webInput}
                type="text"
                name="operatorId"
                inputMode="numeric"
                placeholder="ID DE OPERADOR"
                value={formData.operatorId}
                onChange={handleInputChange}
                onFocus={() => setActiveField('operatorId')}
                disabled={isFormDisabled}
                autoFocus
                autoComplete="off"
                maxLength={15}
              />
              <input
                ref={passwordInputRef}
                className={styles.webInput}
                type="password"
                name="password"
                inputMode="numeric"
                placeholder="CONTRASEÑA"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setActiveField('password')}
                disabled={isFormDisabled}
                autoComplete="off"
              />
              {showLoginError && loginErrorMessage && (
                <div className={styles.webError}>{loginErrorMessage}</div>
              )}
              <button
                type="submit"
                className={styles.webButton}
                disabled={isFormDisabled}
              >
                {isLoggingIn ? 'ACCEDIENDO...' : 'ACCESO'}
              </button>
            </form>
          </div>
        </>)}

        {/* Device Error Modal */}
        {deviceError && (deviceError === 'DEVICE_IN_USE' || deviceError === 'DEVICE_NOT_FOUND' || deviceError === 'DEVICE_NOT_CONFIGURED') && (
          <SessionErrorModal
            deviceId={deviceId || 'No configurado'}
            errorType={getDeviceErrorType()}
            activeSessionDetails={activeSessionDetails}
            onClose={deviceError === 'DEVICE_NOT_FOUND' ? handleDeviceErrorClose : undefined}
          />
        )}
      </div>
    </ScaleWrapper>
  )
}
