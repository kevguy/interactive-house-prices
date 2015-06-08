# House prices

## Convert Shapefile to TopoJSON

```topojson --id-property name --simplify-proportion 0.1 Areas.shp > areas-topo.json```

## Queries

NOTE: The table `houseprice_test` has a reduced dataset for testing, use instead of `houseprice` for
faster results

House prices broken down by postcode area
```
SELECT EXTRACT(year FROM date_of_sale) AS year,
       EXTRACT(month FROM date_of_sale) AS month,
       postcode_area, AVG(price), COUNT(*)
FROM houseprice WHERE postcode_area != ''
GROUP BY year, month, postcode_area
ORDER BY year, month
```
