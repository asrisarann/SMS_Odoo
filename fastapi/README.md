# Champions Club Cafe & Bar FastAPI Backend

This FastAPI backend will manage Cafe & Bar operations for the Champions Club Management System.

## Project structure

- `app/` contains the backend application package.
- `app/main.py` creates the FastAPI application and defines API routes.
- `tests/` contains future automated tests.
- `venv/` is the local Python virtual environment.

## Virtual environment

A virtual environment keeps this project's Python interpreter and packages isolated from other projects and the system installation.

Do not commit `venv/` to GitHub because it contains machine-specific files and is large to distribute. Recreate it using a Python interpreter and manage dependencies through requirements or project configuration files.

## Activation on Windows PowerShell

From `SMS_Odoo/fastapi/`:

```powershell
.\venv\Scripts\Activate.ps1
```

Activation prepends the virtual environment's Python and scripts to the current PowerShell session. Deactivate it with:

```powershell
deactivate
```
