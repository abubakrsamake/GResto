#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect("dbname=DB_GResto user=postgres password=root host=localhost port=5432")
cur = conn.cursor()
cur.execute("SELECT id, name FROM points_of_sale WHERE is_active = true")
rows = cur.fetchall()
print("POS existants:", rows)
if rows:
    for r in rows:
        cur.execute("UPDATE points_of_sale SET id = %s WHERE id = %s", ("3fa85f64-5717-4562-b3fc-2c963f66afa6", r[0]))
        print("POS mis a jour:", r[0], "-> 3fa85f64...")
else:
    cur.execute("INSERT INTO points_of_sale (id, name, address, is_active) VALUES (%s, %s, %s, %s)", ("3fa85f64-5717-4562-b3fc-2c963f66afa6", "Caisse Principale", "123 Rue", True))
    print("POS insere")
conn.commit()
cur.close()
conn.close()
print("Termine")
