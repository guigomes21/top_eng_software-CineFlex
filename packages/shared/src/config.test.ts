import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductConfig } from './index.ts';

const basic = {
  name: 'cineflex-basic', description: 'Catálogo básico',
  features: {
    catalog: true, movieDetails: true, history: true, recommendations: true,
    favorites: false, genreFilter: false, darkTheme: false,
  },
};

test('configuração válida é aceita', () => {
  assert.equal(validateProductConfig(basic).name, 'cineflex-basic');
});

test('feature obrigatória não pode ser removida', () => {
  assert.throws(() => validateProductConfig({ ...basic, features: { ...basic.features, history: false } }), /obrigatória/);
});

test('bloqueia nome inseguro no produto', () => {
  assert.throws(() => validateProductConfig({ ...basic, name: '../outro' }), /nome do produto/);
});
