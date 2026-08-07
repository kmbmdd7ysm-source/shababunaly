/**
 * Compatibility wrapper — readiness state lives in ReadinessProvider.
 * Banner UI is owned by GlobalChrome → ReadinessBanner.
 */
export { ReadinessProvider as default, getProductionReadiness } from '../../context/ReadinessContext';
