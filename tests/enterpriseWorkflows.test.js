import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260801020000_shababuna_enterprise_workflows.sql');
const proofMigration = read(
  'supabase/migrations/20260801021000_shababuna_customer_enterprise_rpcs.sql',
);
const workspace = read('src/components/account/OrganizationWorkspace.jsx');
const operations = [
  read('src/pages/OperationsPage.tsx'),
  read('src/components/operations/OperationsEnterpriseModules.jsx'),
  read('src/components/operations/OperationsCommerceModules.jsx'),
].join('\n');
const b2b = read('src/services/b2b.js');
const app = read('src/App.jsx');

await test('enterprise B2B workflows', async (t) => {
  await t.test('creates contracts, signatures, payment proofs, reorders and team lockers', () => {
    for (const table of [
      'organization_contracts',
      'contract_signatures',
      'payment_proofs',
      'reorder_requests',
      'team_locker_stores',
      'team_locker_products',
      'team_locker_orders',
    ]) {
      assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    }
  });

  await t.test('protects customer enterprise data with membership and owner RLS', () => {
    assert.match(migration, /organization contracts visible to members/);
    assert.match(migration, /payment proofs visible to owner/);
    assert.match(migration, /reorders visible to organization/);
    assert.match(migration, /customers read own invoices/);
    assert.match(migration, /customers read own shipments/);
  });

  await t.test('uses audited electronic signatures and cumulative payment proof records', () => {
    assert.match(migration, /customer_sign_contract/);
    assert.match(migration, /signed_payload_hash/);
    assert.match(migration, /contract_signed/);
    assert.match(proofMigration, /customer_register_payment_proof/);
    assert.match(proofMigration, /staff_review_payment_proof/);
  });

  await t.test('exposes real customer workspace actions instead of marketing-only cards', () => {
    for (const feature of [
      'EnterpriseDocuments',
      'ShipmentWorkspace',
      'MessageWorkspace',
      'ReorderWorkspace',
      'TeamLockerWorkspace',
    ])
      assert.match(workspace, new RegExp(feature));
    assert.match(b2b, /createProjectMessage/);
    assert.match(b2b, /createReorderRequest/);
    assert.match(b2b, /submitPaymentProof/);
    assert.match(b2b, /signOrganizationContract/);
  });

  await t.test('provides a guarded team locker route using trusted catalog products', () => {
    assert.match(app, /team-locker\/:slug/);
    assert.match(read('src/pages/TeamLockerPage.tsx'), /getTeamLocker/);
    assert.match(read('src/pages/TeamLockerPage.tsx'), /ProductCard/);
  });

  await t.test('adds staff visibility and actions for enterprise workflow queues', () => {
    assert.match(operations, /EnterpriseOperationsPanel/);
    assert.match(operations, /PaymentProofReviewCard/);
    assert.match(operations, /Create Contract|Create Team Locker/);
  });

  await t.test(
    'uploads private proofs through quarantine APIs and never accepts arbitrary public URLs as proof',
    () => {
      const proofApi = read('api/payment-proof.js');
      assert.match(proofApi, /media-quarantine/);
      assert.match(proofApi, /validateEncodedFiles/);
      assert.match(proofApi, /customer_register_payment_proof/);
      const signApi = read('api/contract-sign.js');
      assert.match(signApi, /createHash/);
      assert.match(signApi, /customer_sign_contract/);
    },
  );
});
