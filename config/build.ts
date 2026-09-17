// The hosted tester build shares the app, but does not ship the large offline model
// or connect to a development diagnostics receiver.
export const hostedWeb = import.meta.env.VITE_HOSTED_WEB === 'true';
export const offlineRecognitionAvailable = !hostedWeb;
