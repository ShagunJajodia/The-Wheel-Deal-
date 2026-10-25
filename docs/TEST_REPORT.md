# Test report

Date: 2026-10-26 00:49 IST  
Commit: 0cd36cb

Raw output, written straight from the shell.

## Backend: pytest with coverage

```text
$ python -m pytest -q -p no:cacheprovider --cov=app --cov-report=term-missing
........................................................................ [ 33%]
........................................................................ [ 66%]
........................................................................ [ 99%]
..                                                                       [100%]
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
app\models\vehicle.py              51      0   100%
app\repositories\__init__.py        0      0   100%
app\repositories\user.py           11      0   100%
app\repositories\vehicle.py        42      0   100%
app\schemas\__init__.py             0      0   100%
app\schemas\user.py                44      2    95%   37, 44
app\schemas\vehicle.py            112      0   100%
app\scripts\__init__.py             0      0   100%
app\scripts\create_admin.py        41      1    98%   65
app\scripts\seed_vehicles.py       51      1    98%   395
app\services\__init__.py            0      0   100%
app\services\auth.py               38      0   100%
app\services\vehicle.py            45      0   100%
-------------------------------------------------------------
TOTAL                             619      6    99%
218 passed, 1 warning in 101.98s (0:01:41)
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


 Test Files  13 passed (13)
      Tests  88 passed (88)
   Start at  00:50:58
   Duration  15.70s (environment 66%, tests 19%, setup 10%, import 5%, transform 1%)

Environment  jsdom was created 13 times · 72.92s total, 66% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

```
