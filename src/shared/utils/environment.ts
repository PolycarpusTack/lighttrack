// Safe environment checks that work in both main and renderer processes
export const isDevelopment = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development' 
  : false;

export const isProduction = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'production' 
  : true;

export const isTest = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'test' 
  : false;

export const getPlatform = (): 'windows' | 'mac' | 'linux' => {
  if (typeof process === 'undefined') {
    return 'linux'; // Default for renderer process
  }
  
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'mac';
    default:
      return 'linux';
  }
};

export const getAppVersion = (): string => {
  if (typeof process === 'undefined') {
    return '0.0.0';
  }
  return process.env.npm_package_version || '0.0.0';
};