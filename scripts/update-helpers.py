#!/usr/bin/env python3

"""
Template Update Helper Utilities

Cross-platform Python utilities for template update workflow.
Each function can be called individually from command line.

Usage:
  uv run python scripts/update-helpers.py getVersion
  uv run python scripts/update-helpers.py listTags
  uv run python scripts/update-helpers.py getTimestamp
  uv run python scripts/update-helpers.py compareVersions 2.0.6 2.0.7
  uv run python scripts/update-helpers.py getTemplateName
  uv run python scripts/update-helpers.py getTemplateUrl
"""

import json
import re
import subprocess
import sys
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict, cast

# ============================================================================
# Template Repository Mapping
# ============================================================================

TEMPLATE_REPOS: dict[str, str] = {
    "rag-saas": "https://github.com/shipkitai/rag-saas.git",
    "chat-saas": "https://github.com/shipkitai/chat-saas.git",
    "chat-simple": "https://github.com/shipkitai/chat-simple.git",
    "rag-simple": "https://github.com/shipkitai/rag-simple.git",
    "adk-agent-saas": "https://github.com/shipkitai/adk-agent-saas.git",
    "adk-agent-simple": "https://github.com/shipkitai/adk-agent-simple.git",
    "adk-walkthrough-youtube": "https://github.com/shipkitai/adk-walkthrough-youtube.git",
    "chat-llm-arena-walkthrough": "https://github.com/shipkitai/chat-llm-arena-walkthrough.git",
    "rag-ai-course-walkthrough": "https://github.com/shipkitai/rag-ai-course-walkthrough.git",
}


# ============================================================================
# Helper Types
# ============================================================================


class ParsedVersion(TypedDict):
    major: int
    minor: int
    patch: int
    string: str


# ============================================================================
# Helper Functions
# ============================================================================


def read_shipkit_json() -> dict[str, str]:
    """Read and parse shipkit.json from current directory."""
    shipkit_path = Path.cwd() / "shipkit.json"
    if not shipkit_path.exists():
        print("Error: shipkit.json not found in current directory", file=sys.stderr)
        sys.exit(1)
    return cast(dict[str, str], json.loads(shipkit_path.read_text(encoding="utf-8")))


def parse_version(version: str) -> ParsedVersion | None:
    """Parse semantic version string into components."""
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)$", version)
    if not match:
        return None
    return {
        "major": int(match.group(1)),
        "minor": int(match.group(2)),
        "patch": int(match.group(3)),
        "string": version,
    }


# ============================================================================
# Utility Functions (called from command line)
# ============================================================================


def get_version() -> None:
    """Get current version from shipkit.json."""
    shipkit = read_shipkit_json()
    print(shipkit["version"])


def get_template_name() -> None:
    """Get template name from shipkit.json."""
    shipkit = read_shipkit_json()
    print(shipkit["templateName"])


def get_template_url() -> None:
    """Get template repository URL from shipkit.json."""
    shipkit = read_shipkit_json()
    template_name = shipkit["templateName"]
    template_url = TEMPLATE_REPOS.get(template_name)
    if not template_url:
        print(f"Error: Unknown template '{template_name}'", file=sys.stderr)
        sys.exit(1)
    print(template_url)


def list_tags() -> None:
    """
    List all version tags from git, sorted.
    Output: one version per line (e.g., "2.0.6\\n2.0.7")
    """
    try:
        result = subprocess.run(
            [
                "git",
                "tag",
                "--list",
                "v[0-9]*.[0-9]*.[0-9]*",
                "[0-9]*.[0-9]*.[0-9]*",
                "--sort=version:refname",
            ],
            stdout=subprocess.PIPE,
            text=True,
            check=True,
            stderr=subprocess.DEVNULL,
        )
        tags = [
            tag.lstrip("v") for tag in result.stdout.strip().split("\n") if tag.strip()
        ]
        print("\n".join(tags))
    except subprocess.CalledProcessError:
        # If git command fails, exit with error
        sys.exit(1)


def get_timestamp() -> None:
    """Get current timestamp in format: YYYYMMDD-HHMMSS."""
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y%m%d-%H%M%S")
    print(timestamp)


def compare_versions(v1: str | None, v2: str | None) -> None:
    """
    Compare two version strings.
    Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
    """
    if not v1 or not v2:
        print("Error: Invalid version format", file=sys.stderr)
        sys.exit(1)

    parsed1 = parse_version(v1)
    parsed2 = parse_version(v2)

    if not parsed1 or not parsed2:
        print("Error: Invalid version format", file=sys.stderr)
        sys.exit(1)

    if parsed1["major"] != parsed2["major"]:
        print(parsed1["major"] - parsed2["major"])
        return
    if parsed1["minor"] != parsed2["minor"]:
        print(parsed1["minor"] - parsed2["minor"])
        return
    print(parsed1["patch"] - parsed2["patch"])


def is_version_greater(v1: str | None, v2: str | None) -> None:
    """
    Check if version v1 is greater than v2.
    Returns: "true" or "false"
    """
    if not v1 or not v2:
        print("Error: Invalid version format", file=sys.stderr)
        sys.exit(1)

    parsed1 = parse_version(v1)
    parsed2 = parse_version(v2)

    if not parsed1 or not parsed2:
        print("Error: Invalid version format", file=sys.stderr)
        sys.exit(1)

    if parsed1["major"] != parsed2["major"]:
        print("true" if parsed1["major"] > parsed2["major"] else "false")
        return
    if parsed1["minor"] != parsed2["minor"]:
        print("true" if parsed1["minor"] > parsed2["minor"] else "false")
        return
    print("true" if parsed1["patch"] > parsed2["patch"] else "false")


def update_version(new_version: str | None) -> None:
    """
    Update version in shipkit.json.
    Usage: uv run python scripts/update-helpers.py updateVersion 2.0.7
    """
    if not new_version:
        print("Error: Version argument required", file=sys.stderr)
        sys.exit(1)

    parsed = parse_version(new_version)
    if not parsed:
        print("Error: Invalid version format. Use X.Y.Z format", file=sys.stderr)
        sys.exit(1)

    shipkit_path = Path.cwd() / "shipkit.json"
    shipkit = read_shipkit_json()
    shipkit["version"] = new_version
    shipkit_path.write_text(json.dumps(shipkit, indent=2) + "\n", encoding="utf-8")
    print(f"Updated version to {new_version}")


def categorize_version(from_version: str | None, to_version: str | None) -> None:
    """
    Categorize version jump (patch, minor, major).
    Usage: uv run python scripts/update-helpers.py categorizeVersion 2.0.6 2.0.7
    """
    if not from_version or not to_version:
        print("Error: Invalid version format", file=sys.stderr)
        sys.exit(1)

    parsed_from = parse_version(from_version)
    parsed_to = parse_version(to_version)

    if not parsed_from or not parsed_to:
        print("Error: Invalid version format", file=sys.stderr)
        sys.exit(1)

    if parsed_from["major"] != parsed_to["major"]:
        print("major")
    elif parsed_from["minor"] != parsed_to["minor"]:
        print("minor")
    else:
        print("patch")


def is_git_clean() -> None:
    """
    Check if git working directory is clean.
    Returns: "true" or "false"
    """
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            stdout=subprocess.PIPE,
            text=True,
            check=False,
            stderr=subprocess.DEVNULL,
        )
        print("true" if result.stdout.strip() == "" else "false")
    except subprocess.CalledProcessError:
        print("false")


def get_current_branch() -> None:
    """Get current git branch."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            stdout=subprocess.PIPE,
            text=True,
            check=True,
            stderr=subprocess.DEVNULL,
        )
        print(result.stdout.strip())
    except subprocess.CalledProcessError:
        print("Error: Not in a git repository", file=sys.stderr)
        sys.exit(1)


def remote_exists(remote_name: str | None) -> None:
    """
    Check if git remote exists.
    Usage: uv run python scripts/update-helpers.py remoteExists upstream
    Returns: "true" or "false"
    """
    if not remote_name:
        print("Error: Remote name required", file=sys.stderr)
        sys.exit(1)

    try:
        subprocess.run(
            ["git", "config", "--get", f"remote.{remote_name}.url"],
            stdout=subprocess.PIPE,
            text=True,
            check=True,
            stderr=subprocess.DEVNULL,
        )
        print("true")
    except subprocess.CalledProcessError:
        print("false")


def setup_upstream() -> None:
    """
    Set up upstream remote if it doesn't exist.
    Automatically gets template URL from shipkit.json and adds upstream remote.
    """
    # Check if upstream already exists
    try:
        subprocess.run(
            ["git", "config", "--get", "remote.upstream.url"],
            stdout=subprocess.PIPE,
            text=True,
            check=True,
            stderr=subprocess.DEVNULL,
        )
        print("Upstream remote already exists")
        return
    except subprocess.CalledProcessError:
        # Upstream doesn't exist, add it
        pass

    # Get template URL from shipkit.json
    shipkit = read_shipkit_json()
    template_name = shipkit["templateName"]
    template_url = TEMPLATE_REPOS.get(template_name)

    if not template_url:
        print(f"Error: Unknown template '{template_name}'", file=sys.stderr)
        sys.exit(1)

    # Add upstream remote
    try:
        subprocess.run(
            ["git", "remote", "add", "upstream", template_url],
            check=True,
            text=True,
        )
        print(f"Added upstream remote: {template_url}")
    except subprocess.CalledProcessError:
        print("Error: Failed to add upstream remote", file=sys.stderr)
        sys.exit(1)


# ============================================================================
# Main Command Router
# ============================================================================


def show_help() -> None:
    """Show help message with all available commands."""
    help_text = """
Template Update Helper Utilities

Usage:
  uv run python scripts/update-helpers.py <command> [arguments]

Commands:
  getVersion                    - Get current version from shipkit.json
  getTemplateName              - Get template name from shipkit.json
  getTemplateUrl               - Get template repository URL
  listTags                     - List all version tags from git
  getTimestamp                 - Get current timestamp (YYYYMMDD-HHMMSS)
  compareVersions <v1> <v2>    - Compare two versions (-1, 0, or 1)
  isVersionGreater <v1> <v2>   - Check if v1 > v2 (true/false)
  updateVersion <version>      - Update version in shipkit.json
  categorizeVersion <from> <to> - Categorize version jump (patch/minor/major)
  isGitClean                   - Check if git working directory is clean
  getCurrentBranch             - Get current git branch name
  remoteExists <name>          - Check if git remote exists (true/false)
  setupUpstream                - Set up upstream remote (auto-detects from shipkit.json)

Examples:
  uv run python scripts/update-helpers.py getVersion
  uv run python scripts/update-helpers.py compareVersions 2.0.6 2.0.7
  uv run python scripts/update-helpers.py updateVersion 2.0.7
  uv run python scripts/update-helpers.py remoteExists upstream
"""
    print(help_text)


def main() -> None:
    """Main entry point for command-line execution."""
    command = sys.argv[1] if len(sys.argv) > 1 else None

    if not command or command in ("help", "--help", "-h"):
        show_help()
        sys.exit(0)

    commands: dict[str, tuple[Callable[..., None], list[str | None]]] = {
        "getVersion": (get_version, []),
        "getTemplateName": (get_template_name, []),
        "getTemplateUrl": (get_template_url, []),
        "listTags": (list_tags, []),
        "getTimestamp": (get_timestamp, []),
        "compareVersions": (
            compare_versions,
            [
                sys.argv[2] if len(sys.argv) > 2 else None,
                sys.argv[3] if len(sys.argv) > 3 else None,
            ],
        ),
        "isVersionGreater": (
            is_version_greater,
            [
                sys.argv[2] if len(sys.argv) > 2 else None,
                sys.argv[3] if len(sys.argv) > 3 else None,
            ],
        ),
        "updateVersion": (
            update_version,
            [sys.argv[2] if len(sys.argv) > 2 else None],
        ),
        "categorizeVersion": (
            categorize_version,
            [
                sys.argv[2] if len(sys.argv) > 2 else None,
                sys.argv[3] if len(sys.argv) > 3 else None,
            ],
        ),
        "isGitClean": (is_git_clean, []),
        "getCurrentBranch": (get_current_branch, []),
        "remoteExists": (
            remote_exists,
            [sys.argv[2] if len(sys.argv) > 2 else None],
        ),
        "setupUpstream": (setup_upstream, []),
    }

    if command in commands:
        func, args = commands[command]
        func(*args)
    else:
        print(f"Error: Unknown command '{command}'", file=sys.stderr)
        print(
            "Run 'uv run python scripts/update-helpers.py help' for usage information",
            file=sys.stderr,
        )
        sys.exit(1)


# ============================================================================
# Execute Command
# ============================================================================

if __name__ == "__main__":
    main()
