// This file ensures n8n can find and load your nodes and credentials
const { blue } = require('./dist/nodes/blue/Blue.node.js');

module.exports = {
	nodeTypes: {
		blue: blue,
	},
	credentialTypes: {
		blueapiApi: require('./dist/credentials/BlueapiApi.credentials.js').BlueapiApi,
	},
};