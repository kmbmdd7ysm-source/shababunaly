import { describe, expect, it } from './test-api.js';
import { getProductPublishIssues, hasRealProductMedia, hasUsableProductMedia, hasSellablePrice, hasValidSku, isProductPublishable, isProductPurchasable, isProductVisible, isReadyToShipEligible, isVariantPurchasable, getVariantPurchaseLimit, PRODUCT_STATUSES } from '../src/utils/productEligibility.js';
const approved={id:'approved-1',sku:'SHA-REAL-001',status:'active',price:25,available:true,image:'/media/products/approved.webp',mediaStatus:'approved',inventorySource:'supplier_order'};
describe('product publishing eligibility',()=>{
 it('validates real media, price and SKU',()=>{expect(hasRealProductMedia(approved)).toBe(true);expect(hasRealProductMedia({...approved,image:'/images/catalog/concept.svg'})).toBe(false);expect(hasRealProductMedia({...approved,mediaStatus:'concept'})).toBe(false);expect(hasSellablePrice(approved)).toBe(true);expect(hasSellablePrice({...approved,price:0})).toBe(false);expect(hasValidSku(approved)).toBe(true);expect(hasValidSku({...approved,sku:'x'})).toBe(false);expect(hasValidSku({...approved,sku:null})).toBe(false);});
 it('allows clearly labelled placeholder media but blocks unverified inventory',()=>{const placeholder={...approved,image:'/images/catalog/concept.webp',mediaStatus:'concept',inventorySource:'supplier_order'};expect(isProductPublishable(placeholder)).toBe(true);expect(isProductVisible(placeholder)).toBe(true);const unsafe={...placeholder,inventorySource:'unverified_catalog'};expect(isProductPublishable(unsafe)).toBe(false);expect(getProductPublishIssues(unsafe)).toEqual(expect.arrayContaining(['unverified_inventory_source']));});
 it('supports active and safe coming-soon visibility',()=>{expect(isProductPublishable(approved)).toBe(true);expect(isProductVisible(approved)).toBe(true);expect(isProductVisible({...approved,status:PRODUCT_STATUSES.COMING_SOON})).toBe(true);expect(isProductPublishable({...approved,status:PRODUCT_STATUSES.DRAFT})).toBe(false);expect(isProductVisible(null)).toBe(false);expect(isProductPublishable({...approved,available:false})).toBe(false);expect(isProductPublishable({...approved,comingSoon:true})).toBe(false);});
 it('requires a purchasable variant',()=>{const tracked={...approved,variants:[{sku:'SHA-M',inventoryTracking:true,stock:2,availabilityState:'in_stock'}]};expect(isProductPurchasable(tracked)).toBe(true);expect(isVariantPurchasable(tracked,tracked.variants[0])).toBe(true);expect(isVariantPurchasable(tracked,{sku:'SHA-U',inventoryTracking:false})).toBe(true);expect(isVariantPurchasable(tracked,{sku:'SHA-O',inventoryTracking:true,stock:0})).toBe(false);expect(isVariantPurchasable(tracked,{sku:'SHA-O',inventoryTracking:true,stock:2,availabilityState:'out_of_stock'})).toBe(false);expect(isProductPurchasable({...approved,variants:[]})).toBe(false);expect(isProductPurchasable({...approved,variants:null})).toBe(false);expect(isVariantPurchasable({...approved,status:'draft'},{sku:'x'})).toBe(false);expect(isVariantPurchasable(tracked,{})).toBe(false);});
 it('requires verified Libya inventory for Ready to Ship',()=>{const ready={...approved,readyToShip:true,inventoryTracking:true,inventoryLocation:'LY',variants:[{sku:'SHA-M',inventoryTracking:true,readyToShip:true,stock:1}]};expect(isReadyToShipEligible(ready,'LY')).toBe(true);expect(isReadyToShipEligible(ready,'US')).toBe(false);expect(isReadyToShipEligible({...ready,readyToShip:false},'LY')).toBe(false);expect(isReadyToShipEligible({...ready,inventoryTracking:false},'LY')).toBe(false);expect(isReadyToShipEligible({...ready,inventoryLocation:'CN'},'LY')).toBe(false);expect(isReadyToShipEligible({...ready,variants:[{...ready.variants[0],readyToShip:false}]},'LY')).toBe(false);expect(isReadyToShipEligible({...ready,variants:null,stock:2},'LY')).toBe(true);expect(isReadyToShipEligible({...ready,variants:null,stock:0},'LY')).toBe(false);});
 it('reports every publishing issue including unverified claims',()=>{expect(getProductPublishIssues({status:'active',sku:'',image:'',price:0,inventorySource:'concept_only',madeInUSA:true,claimVerified:false})).toEqual(expect.arrayContaining(['missing_or_invalid_sku','missing_usable_media','missing_price','unverified_inventory_source','unverified_manufacturing_claim']));expect(getProductPublishIssues({...approved,status:'coming_soon',price:0})).not.toContain('missing_price');});
});

describe('product eligibility edge coverage',()=>{
 it('rejects missing products, unavailable variants and every unsafe inventory source',()=>{
   expect(isProductPublishable(null)).toBe(false); expect(isProductPurchasable(null)).toBe(false); expect(isVariantPurchasable(approved,null)).toBe(false);
   for(const source of ['unverified_catalog','concept_only','sample_data']) expect(isProductPublishable({...approved,inventorySource:source})).toBe(false);
   expect(isVariantPurchasable({...approved,variants:[]},{sku:'X-1',inventoryTracking:true,stock:2,availabilityState:'unavailable'})).toBe(false);
 });
 it('handles coming soon media and status issue combinations exactly',()=>{
   expect(isProductVisible({...approved,status:'coming_soon',sku:'x',image:'/media/real.webp',mediaStatus:'approved'})).toBe(false);
   expect(isProductVisible({...approved,status:'coming_soon',image:'',mediaStatus:'approved'})).toBe(false);
   expect(getProductPublishIssues({...approved,madeInUSA:false,claimVerified:false})).not.toContain('unverified_manufacturing_claim');
   expect(getProductPublishIssues(null)).toEqual(expect.arrayContaining(['missing_or_invalid_sku','missing_usable_media','missing_price']));
 });
 it('supports product-level stock only when variants are absent',()=>{
   const ready={...approved,readyToShip:true,inventoryTracking:true,inventoryLocation:'ly',variants:null,stock:'3'};
   expect(isReadyToShipEligible(ready)).toBe(true); expect(isReadyToShipEligible({...ready,stock:'bad'})).toBe(false);
 });
});

describe('product eligibility complete branches',()=>{
 it('computes safe purchase limits for tracked and supplier-order variants',()=>{expect(getVariantPurchaseLimit(null)).toBe(0);expect(getVariantPurchaseLimit({inventoryTracking:false},25)).toBe(25);expect(getVariantPurchaseLimit({inventoryTracking:true,stock:3})).toBe(3);expect(getVariantPurchaseLimit({inventoryTracking:true,stock:'bad'})).toBe(0);});
 it('handles empty media status, non-string SKU and untracked availability',()=>{expect(hasRealProductMedia({...approved,mediaStatus:null})).toBe(false);expect(hasValidSku({...approved,sku:123})).toBe(false);expect(isVariantPurchasable(approved,{sku:'SKU-1',inventoryTracking:true,stock:1})).toBe(true);});
 it('handles null location and variant arrays with mixed stock',()=>{const ready={...approved,readyToShip:true,inventoryTracking:true,inventoryLocation:null,variants:[{sku:'A',inventoryTracking:true,stock:1}]};expect(isReadyToShipEligible(ready)).toBe(false);expect(isReadyToShipEligible({...ready,inventoryLocation:'LY',variants:[{sku:'A',inventoryTracking:false,stock:5},{sku:'B',inventoryTracking:true,stock:1}]})).toBe(true);});
});

describe('product inventory source fallback',()=>{it('allows an empty non-blocked source when all other publishing requirements pass',()=>{expect(isProductPublishable({...approved,inventorySource:null})).toBe(true);});});


describe('product eligibility final branch closure',()=>{
 it('covers placeholder fallback media and each publish rejection independently',()=>{
   expect(hasUsableProductMedia({...approved,image:'/images/catalog/fallback.svg',mediaStatus:''})).toBe(true);
   expect(hasUsableProductMedia({...approved,image:'/media/unknown.webp',mediaStatus:''})).toBe(false);
   expect(isProductPublishable({...approved,sku:'x'})).toBe(false);
   expect(isProductPublishable({...approved,price:0,quoteOnly:false})).toBe(false);
 });
 it('covers inactive variants and ready-to-ship short circuits',()=>{
   expect(isVariantPurchasable(approved,{sku:'SKU-INACTIVE',active:false,inventoryTracking:false})).toBe(false);
   expect(isReadyToShipEligible(null,'LY')).toBe(false);
   const ready={...approved,readyToShip:true,inventoryTracking:true,variants:undefined,stock:2};
   expect(isReadyToShipEligible(ready,'LY')).toBe(false);
   expect(isReadyToShipEligible({...ready,inventoryLocation:'LY'},'LY')).toBe(true);
   expect(isReadyToShipEligible({...ready,inventoryLocation:'LY',variants:[{sku:'A',inventoryTracking:true,stock:1}]},'LY')).toBe(true);
 });
});
