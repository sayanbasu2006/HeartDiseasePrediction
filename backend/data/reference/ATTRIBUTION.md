# UCI reference used for label verification

Janosi, A., Steinbrunn, W., Pfisterer, M., & Detrano, R. (1989). Heart Disease [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C52P4X.

Primary reference: https://archive.ics.uci.edu/dataset/45/heart+disease

License: Creative Commons Attribution 4.0 International, as stated on the UCI dataset page.

`processed.cleveland.data` is preserved byte-for-byte from the UCI download. It is used to verify the user-supplied file's category encodings and outcome meanings; it does not replace the training CSV or enter a new training experiment. Verification script: `scripts/verify_category_mappings.py`.
