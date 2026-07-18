import subprocess, os, re, sys

repo = r'E:/develop/LingInk-cline'

result = subprocess.run(['git', 'diff', '--name-status', '674a6022ee..upstream/main'], capture_output=True, text=True, cwd=repo)
upstream_lines = result.stdout.strip().split('\n')

upstream_files = {}
for line in upstream_lines:
    if not line.strip():
        continue
    parts = line.split('\t', 1)
    if len(parts) < 2:
        continue
    status, fpath = parts[0], parts[1]
    if not fpath.startswith('apps/vscode/'):
        continue
    if re.search(r'test\.', fpath) or '__tests__' in fpath or re.search(r'webview-ui.*test', fpath) or fpath.endswith('.md'):
        continue
    upstream_files[fpath] = status

print(f'Total upstream changed files (filtered): {len(upstream_files)}')

sync_commits = ['0006a4d0b6', 'e8928a1a97', '845ed6977a', 'f2c7cfacdc']
synced_files = set()
for commit in sync_commits:
    result = subprocess.run(['git', 'diff-tree', '--no-commit-id', '-r', '--name-only', commit, '--', 'apps/vscode/'], capture_output=True, text=True, cwd=repo)
    for f in result.stdout.strip().split('\n'):
        f = f.strip()
        if f:
            synced_files.add(f)

print(f'Files synced by at least one sync commit: {len(synced_files)}')

not_synced = {}
synced_but_different = {}

for fpath, status in sorted(upstream_files.items()):
    if fpath in synced_files:
        result2 = subprocess.run(['git', 'diff', '--exit-code', 'HEAD', 'upstream/main', '--', fpath], capture_output=True, cwd=repo)
        if result2.returncode != 0:
            synced_but_different[fpath] = status
    else:
        not_synced[fpath] = status

print()
print('--- FILES NEVER TOUCHED BY ANY SYNC COMMIT (NEVER SYNCED) ---')
for f, s in sorted(not_synced.items()):
    print(f'{s}\t{f}')

print()
print('--- FILES TOUCHED BY SYNC COMMITS BUT STILL DIFFER FROM UPSTREAM ---')
for f, s in sorted(synced_but_different.items()):
    print(f'{s}\t{f}')

print()
print('--- FILES FULLY SYNCED (HEAD == upstream) ---')
fully_synced = set(f for f in upstream_files if f in synced_files and f not in synced_but_different)
for f in sorted(fully_synced):
    print(f'\t{f}')
    
print()
print('SUMMARY:')
print(f'  Total upstream changes: {len(upstream_files)}')
print(f'  Never synced: {len(not_synced)}')
print(f'  Partially synced (still differ): {len(synced_but_different)}')
print(f'  Fully synced (HEAD == upstream): {len(fully_synced)}')
