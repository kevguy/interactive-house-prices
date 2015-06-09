#!/usr/bin/python
import sys, csv, json
from collections import defaultdict

postcode_areas = defaultdict(lambda: defaultdict(lambda: {}))

for row in csv.DictReader(sys.stdin):
    avg = float(row['avg'])
    postcode_areas[row['postcode'].strip()][row['year']][row['month']] = round(float(row['avg']), 2)

print json.dumps(postcode_areas)
