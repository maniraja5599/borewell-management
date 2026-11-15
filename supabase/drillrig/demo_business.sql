-- Demo business for checking the admin console: "DEMO – Sri Murugan Borewells".
-- Owned by the admin's account (set the email below) but with NO member row, so it never appears in anyone's app.
-- Safe to run again (it first removes the old demo). Remove it any time:
--   delete from drillrig.company where name = 'DEMO – Sri Murugan Borewells';
begin;

delete from drillrig.company where name = 'DEMO – Sri Murugan Borewells';

with owner as (select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com'), -- put the admin's Google email here
co as (
    insert into drillrig.company (name, created_by) select 'DEMO – Sri Murugan Borewells', id from owner returning id, created_by
),
rig as (
    insert into drillrig.rig (company_id, name, bill_prefix, created_by) select id, 'Rig 1', 'SM', created_by from co returning id, company_id
)
insert into drillrig.record (company_id, kind, id, data, rig_id, created_by, updated_by)
select co.id, x.kind, x.rid, x.data, case when x.kind = 'bill' then rig.id end, co.created_by, co.created_by
from co, rig, (values
-- company profile, as the app stores it after sign-in + setup
('setting', 'brand', jsonb_build_object(
    'companyName', 'DEMO – Sri Murugan Borewells', 'tagline', 'Borewell Drilling Services',
    'phones', '98427 12345', 'phoneCountryCode', '+91', 'address', 'Salem Main Road, Namakkal',
    'gstNumber', '33ABCDE1234F1Z5', 'upiId', 'murugan@okaxis', 'upiName', 'Sri Murugan Borewells',
    'website', '', 'billPrefix', 'SM', 'nextBillSeq', 104, 'nextQuoteSeq', 102,
    'casing1Name', '7" Casing Pipe', 'casing2Name', '10" Casing Pipe', 'theme', 'emerald',
    'finalBillTermsNote', 'Thank you !', 'termsNote', 'Prices subject to rock strata & depth.', 'logoDataUrl', '')),
('setting', 'rateProfiles', jsonb_build_array(
    jsonb_build_object('id', 'rp_std', 'name', 'Standard 6.5"', 'isDefault', true, 'rates', jsonb_build_object(
        'baseDrillingRate', 90, 'pvc7Rate', 400, 'pvc10Rate', 700, 'boreBataRate', 2000, 'oldBoreRate', 40, 'slabBufferFt', 5, 'gstPercentage', 18,
        'slabRates', jsonb_build_array(jsonb_build_object('start',1,'end',300,'rate',90), jsonb_build_object('start',301,'end',400,'rate',100), jsonb_build_object('start',401,'end',500,'rate',120), jsonb_build_object('start',501,'end',600,'rate',150)))),
    jsonb_build_object('id', 'rp_hard', 'name', 'Hard rock', 'isDefault', false, 'rates', jsonb_build_object(
        'baseDrillingRate', 110, 'pvc7Rate', 450, 'pvc10Rate', 760, 'boreBataRate', 2500, 'oldBoreRate', 45, 'slabBufferFt', 5, 'gstPercentage', 18,
        'slabRates', jsonb_build_array(jsonb_build_object('start',1,'end',300,'rate',110), jsonb_build_object('start',301,'end',400,'rate',120), jsonb_build_object('start',401,'end',500,'rate',140)))))),
-- customers
('customer', 'demo_c1', jsonb_build_object('id', 'demo_c1', 'name', 'Ravi Kumar', 'phone', '9876543210', 'village', 'Salem')),
('customer', 'demo_c2', jsonb_build_object('id', 'demo_c2', 'name', 'Lakshmi Narayanan', 'phone', '9443012345', 'village', 'Rasipuram')),
('customer', 'demo_c3', jsonb_build_object('id', 'demo_c3', 'name', 'Prakash Poultry Farm', 'phone', '9025088990', 'village', 'Velur')),
-- SM-101: 450 ft new bore, fully paid (advance 20,000 + UPI 63,500) → total 83,500, due 0
('bill', 'demo_b1', jsonb_build_object('id', 'demo_b1', 'billNo', 'SM-101', 'billDate', '2026-11-02', 'customerId', 'demo_c1',
    'custName', 'Ravi Kumar', 'custPhone', '+91 9876543210', 'custLocation', 'Salem',
    'payments', jsonb_build_array(
        jsonb_build_object('id', 'adv_1', 'date', '2026-11-02', 'amount', 20000, 'mode', 'Advance', 'isAdvance', true),
        jsonb_build_object('id', 'p_1', 'date', '2026-11-05', 'amount', 63500, 'mode', 'UPI')),
    'snapshot', jsonb_build_object('docType', 'INVOICE', 'drillingType', 'new', 'boreDia', '6.5"', 'totalDepth', 450,
        'drillingCost', 43000, 'pvc7Length', 60, 'pvc7Rate', 400, 'pvc7Cost', 24000, 'pvc10Length', 20, 'pvc10Rate', 700, 'pvc10Cost', 14000,
        'boreBataCost', 2000, 'grossSubtotal', 83000, 'collarCapCost', 500, 'grandTotal', 83500, 'totalBeforePaymentDiscount', 83500, 'paymentDiscount', 0,
        'advancePaidAmount', 83500, 'balancePayable', 0))),
-- SM-102: 300 ft + 8" MS pipe item; paid 30,000 + 3,000 discount → total 30,000 (was 33,000), due 0
('bill', 'demo_b2', jsonb_build_object('id', 'demo_b2', 'billNo', 'SM-102', 'billDate', '2026-11-08', 'customerId', 'demo_c2',
    'custName', 'Lakshmi Narayanan', 'custPhone', '+91 9443012345', 'custLocation', 'Rasipuram',
    'payments', jsonb_build_array(jsonb_build_object('id', 'p_2', 'date', '2026-11-10', 'amount', 30000, 'mode', 'Cash', 'discount', 3000)),
    'snapshot', jsonb_build_object('docType', 'INVOICE', 'drillingType', 'new', 'boreDia', '6.5"', 'totalDepth', 100,
        'drillingCost', 9000, 'boreBataCost', 2000,
        'extraItems', jsonb_build_array(jsonb_build_object('id', 'it1', 'name', '8" MS pipe', 'qty', 40, 'unit', 'ft', 'rate', 550, 'amount', 22000)),
        'extraItemsCost', 22000, 'grossSubtotal', 33000, 'totalBeforePaymentDiscount', 33000, 'paymentDiscount', 3000, 'grandTotal', 30000,
        'advancePaidAmount', 30000, 'balancePayable', 0))),
-- SM-103: re-bore 200→400 ft with 18% GST → 34,220; advance 10,000 → due 24,220
('bill', 'demo_b3', jsonb_build_object('id', 'demo_b3', 'billNo', 'SM-103', 'billDate', '2026-11-13', 'customerId', 'demo_c3',
    'custName', 'Prakash Poultry Farm', 'custPhone', '+91 9025088990', 'custLocation', 'Velur', 'custGst', '33AAAPP1234Q1Z9',
    'payments', jsonb_build_array(jsonb_build_object('id', 'adv_3', 'date', '2026-11-13', 'amount', 10000, 'mode', 'Advance', 'isAdvance', true)),
    'snapshot', jsonb_build_object('docType', 'INVOICE', 'drillingType', 'repair', 'boreDia', '6.5"', 'oldBoreDepth', 200, 'totalDepth', 400,
        'drillingCost', 27000, 'boreBataCost', 2000, 'grossSubtotal', 29000, 'gstEnabled', true, 'gstPercentage', 18, 'gstAmount', 5220,
        'grandTotal', 34220, 'totalBeforePaymentDiscount', 34220, 'paymentDiscount', 0, 'advancePaidAmount', 10000, 'balancePayable', 24220))),
-- SM-Q101: quotation (no due)
('bill', 'demo_q1', jsonb_build_object('id', 'demo_q1', 'billNo', 'SM-Q101', 'billDate', '2026-11-14', 'customerId', 'demo_c1',
    'custName', 'Ravi Kumar', 'custPhone', '+91 9876543210', 'custLocation', 'Attur', 'payments', '[]'::jsonb,
    'snapshot', jsonb_build_object('docType', 'QUOTATION', 'drillingType', 'new', 'boreDia', '6.5"', 'totalDepth', 500,
        'drillingCost', 49000, 'pvc7Length', 40, 'pvc7Rate', 400, 'pvc7Cost', 16000, 'boreBataCost', 2000, 'grossSubtotal', 67000, 'grandTotal', 67000)))
) as x(kind, rid, data);

commit;

-- What the admin console should show for this business:
--   final bills 3: billed 83,500 + 30,000 + 34,220 = 1,47,720; received 83,500 + 30,000 + 10,000 = 1,23,500; due 24,220
--   1 quotation (₹67,000, not counted as due); 3 customers; 2 rate cards; company profile filled.
select c.name, (select count(*) from drillrig.record r where r.company_id = c.id) as records
from drillrig.company c where c.name = 'DEMO – Sri Murugan Borewells';
