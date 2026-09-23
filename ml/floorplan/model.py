import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
"""
Model Architectures for Floor-Plan Architectural Typology Classification.
Predicts objective residential layout typologies (Studio, Zoned, Spine, Villa) from real geometry features.
Zero target leakage.
"""
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


def create_typology_classifier_pipeline(random_state: int = 42) -> Pipeline:
    """
    Creates a supervised HistGradientBoostingClassifier pipeline for layout typology prediction.
    Features are standardized via StandardScaler.
    """
    return Pipeline([
        ("scaler", StandardScaler()),
        ("model", HistGradientBoostingClassifier(
            max_iter=150,
            learning_rate=0.08,
            max_leaf_nodes=25,
            min_samples_leaf=10,
            l2_regularization=0.1,
            random_state=random_state
        ))
    ])


def create_baseline_models(random_state: int = 42) -> dict:
    """Returns baseline models for empirical benchmark comparison."""
    return {
        "Dummy (Majority Class)": Pipeline([
            ("scaler", StandardScaler()),
            ("model", DummyClassifier(strategy="most_frequent"))
        ]),
        "Multinomial Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=1000, random_state=random_state))
        ]),
        "Random Forest Classifier": Pipeline([
            ("scaler", StandardScaler()),
            ("model", RandomForestClassifier(n_estimators=100, max_depth=8, random_state=random_state))
        ]),
        "HistGradientBoostingClassifier": Pipeline([
            ("scaler", StandardScaler()),
            ("model", HistGradientBoostingClassifier(
                max_iter=150,
                learning_rate=0.08,
                max_leaf_nodes=25,
                min_samples_leaf=10,
                l2_regularization=0.1,
                random_state=random_state
            ))
        ])
    }
