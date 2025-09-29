#!/usr/bin/env python3
import json
import re

# Read the JSON file
with open('/Users/berkaybasoz/Documents/apps/quickmcp/data/quickmcp.json', 'r') as f:
    data = json.load(f)

# Fix SQL queries - replace OFFSET/FETCH with TOP
def fix_sql_query(query):
    # Pattern to match SELECT ... ORDER BY [Id] OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    pattern = r'(SELECT) ([^"]*) (FROM \[[^\]]*\] WHERE [^"]*) ORDER BY \[Id\] OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY'
    replacement = r'\1 TOP (@limit) \2 \3'
    return re.sub(pattern, replacement, query)

# Process all tools
for tool in data.get('tools', []):
    if 'sqlQuery' in tool:
        old_query = tool['sqlQuery']
        new_query = fix_sql_query(old_query)
        if new_query != old_query:
            tool['sqlQuery'] = new_query
            print(f"Fixed query for tool: {tool.get('name', 'unknown')}")

# Process all resources
for resource in data.get('resources', []):
    if 'sqlQuery' in resource:
        old_query = resource['sqlQuery']
        new_query = fix_sql_query(old_query)
        if new_query != old_query:
            resource['sqlQuery'] = new_query
            print(f"Fixed query for resource: {resource.get('name', 'unknown')}")

# Write the fixed JSON back
with open('/Users/berkaybasoz/Documents/apps/quickmcp/data/quickmcp.json', 'w') as f:
    json.dump(data, f, indent=2)

print("SQL queries fixed successfully!")