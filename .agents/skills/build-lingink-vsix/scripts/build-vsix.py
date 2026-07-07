#!/usr/bin/env python3
"""
Build the LingInk VSIX package.

Usage:
    python scripts/build-vsix.py [--version 0.1.0] [--out <path>]

Run from apps/vscode/ directory.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description="Build LingInk VSIX")
    parser.add_argument("--version", default="0.1.0", help="LingInk version")
    parser.add_argument("--out", default=None, help="Output VSIX path")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    vscode_dir = os.path.join(root, "apps", "vscode")
    os.chdir(vscode_dir)

    version = args.version
    out_path = args.out or f"lingink-{version}.vsix"

    print(f"=== Building LingInk VSIX v{version} ===")

    # Step 1: Verify package.json
    with open("package.json") as f:
        pkg = json.load(f)
    print(f"  Version: {pkg['version']}, clineBaseVersion: {pkg.get('clineBaseVersion', 'N/A')}")

    # Step 2: Build webview
    print("\n[1/5] Building webview UI...")
    subprocess.run(["bun", "run", "build:webview"], check=True)

    # Step 3: Build extension
    print("\n[2/5] Building extension bundle...")
    subprocess.run(["bun", "esbuild.mjs", "--production"], check=True)

    # Step 4: Create staging
    print("\n[3/5] Creating staging directory...")
    staging = ".staging"
    if os.path.exists(staging):
        shutil.rmtree(staging)

    includes = [
        "package.json", "package.nls.json", "package.nls.zh-cn.json",
        "README.md", "CHANGELOG.md", "LICENSE.txt", "skills-lock.json",
        "dist", "assets", "webview-ui/build", "walkthrough", "bundled-skills",
    ]
    for p in includes:
        src = os.path.join(vscode_dir, p)
        dst = os.path.join(staging, p)
        if os.path.exists(src):
            if os.path.isdir(src):
                shutil.copytree(src, dst, symlinks=False, ignore_dangling_symlinks=True)
            else:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)

    # Make prepublish a no-op in staging
    with open(os.path.join(staging, "package.json")) as f:
        staging_pkg = json.load(f)
    staging_pkg["scripts"]["vscode:prepublish"] = 'echo "skipped"'
    with open(os.path.join(staging, "package.json"), "w") as f:
        json.dump(staging_pkg, f, indent="\t")

    # Step 5: Package VSIX
    print("\n[4/5] Packaging VSIX...")
    subprocess.run(
        ["npx", "@vscode/vsce", "package",
         "--out", os.path.join(vscode_dir, out_path),
         "--allow-package-secrets", "slack",
         "--no-dependencies"],
        cwd=staging, check=True,
    )

    # Clean up
    print("\n[5/5] Cleaning up...")
    shutil.rmtree(staging, ignore_errors=True)

    size = os.path.getsize(os.path.join(vscode_dir, out_path))
    print(f"\n=== Done: {out_path} ({size / 1024 / 1024:.1f} MB) ===")


if __name__ == "__main__":
    main()
