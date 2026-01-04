#!/bin/bash
# Convert Markdown to PDF with Mermaid diagram support
# Usage: ./convert-to-pdf.sh <markdown-file>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <markdown-file>"
    echo "Example: $0 projects/active/my-project/document.md"
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File not found: $INPUT_FILE"
    exit 1
fi

BASE_NAME=$(basename "$INPUT_FILE" .md)
DIR_NAME=$(dirname "$INPUT_FILE")

echo "📄 Processing: $INPUT_FILE"

# Check if file has mermaid diagrams
if ! grep -q '```mermaid' "$INPUT_FILE"; then
    echo "ℹ️  No Mermaid diagrams found, using standard conversion..."
    md-to-pdf "$INPUT_FILE"
    echo "✅ PDF generated: ${DIR_NAME}/${BASE_NAME}.pdf"
    exit 0
fi

echo "🎨 Found Mermaid diagrams, converting to PNG first..."

# Create diagrams directory
DIAGRAM_DIR="${DIR_NAME}/diagrams"
mkdir -p "$DIAGRAM_DIR"

# Extract and count mermaid blocks
MERMAID_COUNT=$(grep -c '```mermaid' "$INPUT_FILE" || echo "0")
echo "📊 Found $MERMAID_COUNT Mermaid diagrams"

# Extract each mermaid block and convert
COUNTER=1
IN_MERMAID=false
CURRENT_DIAGRAM=""

while IFS= read -r line; do
    if [[ "$line" == '```mermaid'* ]]; then
        IN_MERMAID=true
        CURRENT_DIAGRAM=""
        continue
    fi

    if [[ "$IN_MERMAID" == true ]]; then
        if [[ "$line" == '```' ]]; then
            # End of mermaid block, convert it
            DIAGRAM_FILE="${DIAGRAM_DIR}/diagram-${COUNTER}.mmd"
            PNG_FILE="${DIAGRAM_DIR}/diagram-${COUNTER}.png"

            echo "$CURRENT_DIAGRAM" > "$DIAGRAM_FILE"
            echo "  Converting diagram $COUNTER..."
            mmdc -i "$DIAGRAM_FILE" -o "$PNG_FILE" -b transparent -w 1400 2>&1 | grep -v "Generating"

            COUNTER=$((COUNTER + 1))
            IN_MERMAID=false
            CURRENT_DIAGRAM=""
        else
            CURRENT_DIAGRAM="${CURRENT_DIAGRAM}${line}"$'\n'
        fi
    fi
done < "$INPUT_FILE"

echo "✅ Generated $((COUNTER - 1)) diagram PNG files"

# Create PDF-ready markdown with image references
PDF_MD="${DIR_NAME}/${BASE_NAME}-pdf.md"
COUNTER=1
IN_MERMAID=false

while IFS= read -r line; do
    if [[ "$line" == '```mermaid'* ]]; then
        IN_MERMAID=true
        echo "![Diagram ${COUNTER}](diagrams/diagram-${COUNTER}.png)" >> "$PDF_MD"
        COUNTER=$((COUNTER + 1))
        continue
    fi

    if [[ "$IN_MERMAID" == true ]]; then
        if [[ "$line" == '```' ]]; then
            IN_MERMAID=false
        fi
        continue
    fi

    echo "$line" >> "$PDF_MD"
done < "$INPUT_FILE"

# Convert to PDF
echo "📑 Generating PDF with embedded diagrams..."
md-to-pdf "$PDF_MD" --css "img { max-width: 100%; height: auto; margin: 20px auto; display: block; }"

# Rename to final PDF
FINAL_PDF="${DIR_NAME}/${BASE_NAME}.pdf"
mv "${DIR_NAME}/${BASE_NAME}-pdf.pdf" "$FINAL_PDF"

# Cleanup temp markdown
rm -f "$PDF_MD"

echo "✅ PDF generated: $FINAL_PDF"
echo "🗂️  Diagrams saved in: $DIAGRAM_DIR/"
