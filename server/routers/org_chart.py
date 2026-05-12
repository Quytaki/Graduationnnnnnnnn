"""Org Chart API router — builds hierarchical tree from employees."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, Department, JobPosition

router = APIRouter(prefix="/api/org-chart", tags=["Organization Chart"])


ROLE_LABELS = {
    "director": "Giám đốc",
    "department_head": "Trưởng phòng",
    "team_lead": "Trưởng nhóm",
    "senior": "Nhân viên cao cấp",
    "staff": "Nhân viên",
}


def _emp_to_node(emp):
    return {
        "id": emp.id,
        "name": emp.name,
        "role": emp.role or "staff",
        "role_label": ROLE_LABELS.get(emp.role or "staff", "Nhân viên"),
        "job_position_name": emp.job_position.name if emp.job_position else None,
        "department_name": emp.department.name if emp.department else None,
        "department_color": emp.department.color if emp.department else "#714B67",
        "avatar_color": emp.avatar_color or "#714B67",
        "manager_id": emp.manager_id,
        "email": emp.work_email or emp.email,
        "phone": emp.work_phone or emp.phone,
        "hire_date": emp.hire_date,
        "children": [],
    }


def _build_tree(employees):
    """Build a tree from flat employee list using manager_id."""
    nodes = {}
    for emp in employees:
        nodes[emp.id] = _emp_to_node(emp)

    roots = []
    for emp in employees:
        node = nodes[emp.id]
        if emp.manager_id and emp.manager_id in nodes:
            nodes[emp.manager_id]["children"].append(node)
        else:
            roots.append(node)

    # Add subordinate counts recursively
    def count_subs(node):
        total = len(node["children"])
        for child in node["children"]:
            total += count_subs(child)
        node["subordinate_count"] = total
        return total

    for root in roots:
        count_subs(root)

    return roots


@router.get("")
def get_full_org_chart(db: Session = Depends(get_db)):
    """Return the full org chart as a tree."""
    employees = (
        db.query(Employee)
        .filter(Employee.status == "active")
        .order_by(Employee.id)
        .all()
    )
    tree = _build_tree(employees)
    return {"tree": tree, "total_employees": len(employees)}


@router.get("/department/{department_id}")
def get_department_chart(department_id: int, db: Session = Depends(get_db)):
    """Return org chart for a specific department."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    employees = (
        db.query(Employee)
        .filter(Employee.department_id == department_id, Employee.status == "active")
        .order_by(Employee.id)
        .all()
    )
    tree = _build_tree(employees)
    return {
        "department": {"id": dept.id, "name": dept.name, "color": dept.color},
        "tree": tree,
        "total_employees": len(employees),
    }


@router.get("/employee/{employee_id}")
def get_employee_context(employee_id: int, db: Session = Depends(get_db)):
    """Return an employee's position in the hierarchy: their manager, peers, and subordinates."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    result = {
        "employee": _emp_to_node(emp),
        "manager": None,
        "peers": [],
        "subordinates": [],
    }

    # Manager
    if emp.manager:
        result["manager"] = _emp_to_node(emp.manager)

    # Peers (same manager, excluding self)
    if emp.manager_id:
        peers = (
            db.query(Employee)
            .filter(
                Employee.manager_id == emp.manager_id,
                Employee.id != emp.id,
                Employee.status == "active",
            )
            .all()
        )
        result["peers"] = [_emp_to_node(p) for p in peers]

    # Subordinates
    subs = (
        db.query(Employee)
        .filter(Employee.manager_id == emp.id, Employee.status == "active")
        .all()
    )
    result["subordinates"] = [_emp_to_node(s) for s in subs]

    return result
