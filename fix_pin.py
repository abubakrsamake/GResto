#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect("dbname=DB_GResto user=postgres password=root host=localhost port=5432")
cur = conn.cursor()
# Mettre a jour le PIN pour Marie avec un vrai hash
cur.execute("UPDATE users SET pin_code = %s WHERE email = %s", ("$2b$12$9gLGH/FzQX2PjbtUt5mIXONww3enVqZgF.u7l3JsI4/8Eja8CCsZC", "marie@resto.com"))
# Aussi mettre le PIN pour admin
cur.execute("UPDATE users SET pin_code = %s WHERE email = %s", ("$2b$12$9gLGH/FzQX2PjbtUt5mIXONww3enVqZgF.u7l3JsI4/8Eja8CCsZC", "admin@resto.com"))
conn.commit()
print("PIN mis a jour")
cur.close()
conn.close()
