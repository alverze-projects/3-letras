const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const libsRoot = path.resolve(projectRoot, '../../libs/src');

const config = getDefaultConfig(projectRoot);

// Permitir que Metro acceda a archivos fuera del directorio del proyecto
config.watchFolders = [libsRoot];

// Soporte explícito para archivos de audio
config.resolver.assetExts = [...config.resolver.assetExts, 'wav', 'mp3', 'ogg'];

module.exports = config;
