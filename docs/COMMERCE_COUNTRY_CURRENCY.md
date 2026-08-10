# Country, currency and exchange rate

Catalogue and order values are canonical USD. The editable production USD-to-LYD rate lives in `public.commerce_settings` under `usd_to_lyd_rate`; the seeded value is `9`.

The browser reads the public value through `get_public_commerce_settings`. Trusted order totals and Libya shipping conversion are recalculated inside `create_order_transactional`; browser-submitted totals and rates are never authoritative. The application uses the approved rate `9` only as a display/bootstrap fallback until the production setting is available.

Country and currency are independent:

- Libya is detected as LYD initially; visitors may switch to USD.
- Other countries are detected as USD initially; visitors may switch to LYD.
- A saved manual choice takes priority over detection.
- Libya-only Cash, Ready to Ship, 20 LYD delivery and the 500 LYD free-delivery threshold depend on destination country, not selected currency.
- International shipping remains pending until the destination price is configured or approved.
