#!/bin/bash

BASE_DIR="./src/seeds/doctor/images"
GENDERS=("female" "male")

for GENDER in "${GENDERS[@]}"; do
  TARGET_DIR="$BASE_DIR/$GENDER"
  echo "Processing $TARGET_DIR..."

  # Проверка существования директории
  if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Directory $TARGET_DIR not found, skipping..."
    continue
  fi

  # Переходим в директорию
  cd "$TARGET_DIR" || exit 1

  # Создаем временную папку для новых имён (во избежание конфликтов)
  mkdir -p tmp_rename

  # Индекс для счётчика
  INDEX=1

  # Перебор всех .png файлов, отсортированных по имени
  for FILE in $(ls -1 *.png | sort); do
    NEW_NAME=$(printf "%d.png" "$INDEX")
    mv "$FILE" "tmp_rename/$NEW_NAME"
    ((INDEX++))
  done

  # Перемещаем обратно
  mv tmp_rename/* .
  rmdir tmp_rename

  echo "✅ Renamed $((INDEX-1)) files in $GENDER"
  cd - >/dev/null || exit 1
done

echo "🎉 Done!"
