import os
import sys

# Dossiers à ignorer
IGNORE_DIRS = {
    'node_modules', '.git', '__pycache__', '.vscode', 
    '.idea', 'dist', 'build', 'venv', '.env'
}

def generate_tree(startpath, prefix="", file=None):
    """Parcourt les dossiers et écrit la structure dans le fichier."""
    try:
        items = os.listdir(startpath)
    except PermissionError:
        return

    # Filtrer et trier (dossiers en premier, puis fichiers)
    items = [item for item in items if item not in IGNORE_DIRS]
    items.sort(key=lambda x: (not os.path.isdir(os.path.join(startpath, x)), x.lower()))

    for i, item in enumerate(items):
        path = os.path.join(startpath, item)
        is_last = (i == len(items) - 1)
        connector = "└── " if is_last else "├── "

        # Écriture dans le fichier txt
        file.write(f"{prefix}{connector}{item}\n")

        if os.path.isdir(path):
            extension = "    " if is_last else "│   "
            generate_tree(path, prefix + extension, file)

if __name__ == "__main__":
    # Dossier cible (par défaut le dossier courant)
    root_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    output_file = "tree_output.txt"

    if not os.path.exists(root_dir):
        print(f"Le dossier '{root_dir}' n'existe pas.")
        sys.exit(1)

    # Ouverture du fichier avec encodage UTF-8 pour les caractères de l'arbre
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"Structure de : {os.path.abspath(root_dir)}\n")
        f.write("=" * 50 + "\n")
        generate_tree(root_dir, "", f)

    print(f"Structure exportée avec succès dans : {output_file}")
