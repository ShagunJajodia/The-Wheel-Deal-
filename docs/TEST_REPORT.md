# Test report

Date: 2026-10-25 23:53 IST  
Commit: 721bc1f

Raw output, written straight from the shell.

## Backend: pytest with coverage

```text
$ python -m pytest -q -p no:cacheprovider --cov=app --cov-report=term-missing
........................................................................ [ 47%]
........................................................................ [ 94%]
........                                                                 [100%]
============================== warnings summary ===============================
.venv\Lib\site-packages\fastapi\testclient.py:1
  C:\Users\Shagun\Documents\Codex\2026-10-25\git-clone-git-github-com-shagunjajodia\The-Wheel-Deal-\backend\.venv\Lib\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=============================== tests coverage ================================
______________ coverage: platform win32, python 3.12.14-final-0 _______________

Name                            Stmts   Miss  Cover   Missing
-------------------------------------------------------------
app\__init__.py                     0      0   100%
app\api\__init__.py                 0      0   100%
app\api\dependencies.py            27      0   100%
app\api\exception_handlers.py      21      0   100%
app\api\routes\__init__.py          0      0   100%
app\api\routes\auth.py             18      0   100%
app\api\routes\health.py            5      0   100%
app\api\routes\vehicles.py         35      0   100%
app\core\__init__.py                0      0   100%
app\core\config.py                 15      0   100%
app\core\errors.py                 14      0   100%
app\db\__init__.py                  0      0   100%
app\db\base.py                      3      0   100%
app\db\session.py                   9      2    78%   13-14
app\main.py                        16      0   100%
app\models\__init__.py              3      0   100%
app\models\user.py                 18      0   100%
app\models\vehicle.py              30      0   100%
app\repositories\__init__.py        0      0   100%
app\repositories\user.py           11      0   100%
app\repositories\vehicle.py        42      0   100%
app\schemas\__init__.py             0      0   100%
app\schemas\user.py                44      2    95%   37, 44
app\schemas\vehicle.py             78      0   100%
app\scripts\__init__.py             0      0   100%
app\scripts\create_admin.py        41      1    98%   65
app\scripts\seed_vehicles.py       42      1    98%   195
app\services\__init__.py            0      0   100%
app\services\auth.py               38      0   100%
app\services\vehicle.py            45      0   100%
-------------------------------------------------------------
TOTAL                             555      6    99%
152 passed, 1 warning in 67.79s (0:01:07)
```

## Backend: ruff

```text
$ ruff check .
All checks passed!
```

## Frontend: vitest

```text
$ npx vitest run

 RUN  v5.0.5 C:/Users/Shagun/Documents/Codex/2026-10-25/git-clone-git-github-com-shagunjajodia/The-Wheel-Deal-/frontend


 Test Files  10 passed (10)
      Tests  51 passed (51)
   Start at  23:54:27
   Duration  10.88s (environment 74%, tests 12%, setup 10%, import 4%, transform 1%)

Environment  jsdom was created 10 times · 53.60s total, 74% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

```
