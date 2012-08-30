from sqlobject import *
from sqlobject.tests.dbtest import *

########################################
## Schema per connection
########################################

class Test(SQLObject):
    foo = UnicodeCol(length=200)

def test_connection_schema():
    if not supports('schema'):
        return
    conn = getConnection()
    conn.schema = None
    conn.query('CREATE SCHEMA test')
    conn.schema = 'test'
    conn.query('SET search_path TO test')
    setupClass(Test)
    Test(foo='bar')
    assert conn.queryAll("SELECT * FROM test.test")
