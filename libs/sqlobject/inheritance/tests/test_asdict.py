from sqlobject import *
from sqlobject.inheritance import *
from sqlobject.tests.dbtest import *

########################################
## sqlmeta.asDict
########################################

class InheritablePerson(InheritableSQLObject):
    first = StringCol()
    last = StringCol(alternateID=True, length=255)

class Boss(InheritablePerson):
    department = StringCol()

class Employee(InheritablePerson):
    _inheritable = False
    position = StringCol()

def test_getColumns():
    setupClass([InheritablePerson, Boss, Employee])

    for klass, columns in (
            (InheritablePerson, ['first', 'last']),
            (Boss, ['department', 'first', 'last']),
            (Employee, ['first', 'last', 'position'])):
        _columns = klass.sqlmeta.getColumns().keys()
        _columns.sort()
        assert _columns == columns

def test_asDict():
    setupClass([InheritablePerson, Boss, Employee])
    InheritablePerson(first='Oneof', last='Authors')
    Boss(first='Boss', last='The', department='Dep')
    Employee(first='Project', last='Leader', position='Project leader')

    assert InheritablePerson.get(1).sqlmeta.asDict() == \
        dict(first='Oneof', last='Authors', id=1)
    assert InheritablePerson.get(2).sqlmeta.asDict() == \
        dict(first='Boss', last='The', department='Dep', id=2)
    assert InheritablePerson.get(3).sqlmeta.asDict() == \
        dict(first='Project', last='Leader', position='Project leader', id=3)
