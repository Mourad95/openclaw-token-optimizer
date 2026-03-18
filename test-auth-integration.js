// Test d'intégration rapide pour l'authentification

const { generateApiKey, isValidApiKey, generateJwtToken, validateJwtToken } = require('./dist/auth/auth.js');

console.log('🧪 Test d\'intégration du module d\'authentification\n');

// Test 1: Génération et validation de clé API
console.log('1. Test Clé API:');
const apiKey = generateApiKey('test-key');
console.log(`   Clé générée: ${apiKey.key}`);
console.log(`   Validation: ${isValidApiKey(apiKey.key) ? '✅ Valide' : '❌ Invalide'}`);

// Test 2: Token JWT
console.log('\n2. Test JWT Token:');
const payload = { userId: 'user-123', role: 'admin' };
const token = generateJwtToken(payload);
console.log(`   Token généré: ${token.substring(0, 50)}...`);
const decoded = validateJwtToken(token);
console.log(`   Validation: ${decoded ? '✅ Valide' : '❌ Invalide'}`);
if (decoded) {
  console.log(`   User ID: ${decoded.userId}`);
  console.log(`   Role: ${decoded.role}`);
}

// Test 3: Clé API invalide
console.log('\n3. Test Clé API invalide:');
const invalidKey = 'invalid_key_123';
console.log(`   Clé testée: ${invalidKey}`);
console.log(`   Validation: ${isValidApiKey(invalidKey) ? '✅ Valide' : '❌ Invalide (attendu)'}`);

// Test 4: Token JWT invalide
console.log('\n4. Test JWT Token invalide:');
const invalidToken = 'invalid.token.here';
const invalidDecoded = validateJwtToken(invalidToken);
console.log(`   Validation: ${invalidDecoded ? '✅ Valide' : '❌ Invalide (attendu)'}`);

console.log('\n🎯 Tous les tests d\'intégration sont terminés !');