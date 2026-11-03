"""Experimental descriptive temporal analysis, isolated from static classification."""

import numpy as np
from scipy.special import logsumexp
from sklearn.preprocessing import StandardScaler
from hmmlearn.hmm import GaussianHMM


def forward_backward(log_emission, start, transition):
    log_start = np.log(np.maximum(start, 1e-300))
    log_trans = np.log(np.maximum(transition, 1e-300))
    n, k = log_emission.shape
    alpha = np.zeros((n, k))
    beta = np.zeros((n, k))
    alpha[0] = log_start + log_emission[0]
    for t in range(1, n):
        alpha[t] = log_emission[t] + logsumexp(
            alpha[t - 1][:, None] + log_trans, axis=0
        )
    for t in range(n - 2, -1, -1):
        beta[t] = logsumexp(
            log_trans + log_emission[t + 1][None, :] + beta[t + 1][None, :], axis=1
        )
    log_likelihood = float(logsumexp(alpha[-1]))
    posterior = np.exp(alpha + beta - log_likelihood)
    return log_likelihood, posterior


def viterbi(log_emission, start, transition):
    n, k = log_emission.shape
    delta = np.zeros((n, k))
    back = np.zeros((n, k), dtype=int)
    log_trans = np.log(np.maximum(transition, 1e-300))
    delta[0] = np.log(np.maximum(start, 1e-300)) + log_emission[0]
    for t in range(1, n):
        score = delta[t - 1][:, None] + log_trans
        back[t] = score.argmax(axis=0)
        delta[t] = score.max(axis=0) + log_emission[t]
    states = np.zeros(n, dtype=int)
    states[-1] = delta[-1].argmax()
    for t in range(n - 2, -1, -1):
        states[t] = back[t + 1, states[t + 1]]
    return states


def kalman(values, times):
    values = np.asarray(values, float)
    variance = max(float(np.var(values)), 1.0)
    q = variance * 0.05
    x = float(values[0])
    P = variance
    out = []
    for i, value in enumerate(values):
        dt = (
            max((times[i] - times[i - 1]).total_seconds() / 86400, 1 / 1440) if i else 1
        )
        P += q * dt
        K = P / (P + variance)
        x += K * (value - x)
        P *= 1 - K
        out.append(
            {
                "observed": float(value),
                "filtered": float(x),
                "estimate_sd": float(np.sqrt(P)),
            }
        )
    return out


def analyze(measurements):
    rows = sorted(measurements, key=lambda r: r.timestamp)
    trends = {}
    keys = ["heart_rate", "systolic", "diastolic", "cholesterol"]
    for key in keys:
        available = [r for r in rows if getattr(r, key) is not None]
        if available:
            trend = kalman(
                [getattr(r, key) for r in available], [r.timestamp for r in available]
            )
            trends[key] = [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "time": r.timestamp.timestamp() * 1000,
                    **v,
                }
                for r, v in zip(available, trend)
            ]
    result = {
        "count": len(rows),
        "trends": trends,
        "hmm": {
            "available": False,
            "reason": "At least 30 complete, distinct, chronologically ordered heart-rate and systolic observations are required.",
        },
        "limitations": [
            "Experimental descriptive pattern analysis. Hidden states are not disease stages. Kalman estimates smooth recorded observations and do not predict medical events.",
            "Kalman process variance scales with elapsed days. HMM assumes approximately regular sampling; irregular series are rejected.",
        ],
    }
    complete = [r for r in rows if r.heart_rate is not None and r.systolic is not None]
    if len(complete) < 30:
        return result
    gaps = np.diff([r.timestamp.timestamp() for r in complete])
    median = float(np.median(gaps))
    if (
        (gaps <= 0).any()
        or median <= 0
        or np.max(np.abs(gaps - median)) / median > 0.35
    ):
        result["hmm"][
            "reason"
        ] = "HMM requires approximately regular distinct observations (intervals within 35% of median); this series has duplicates, gaps or irregular sampling."
        return result
    raw = np.array([[r.heart_rate, r.systolic] for r in complete])
    if (raw.std(axis=0) < 0.5).any():
        result["hmm"][
            "reason"
        ] = "Insufficient measurement variation to fit a stable HMM."
        return result
    scaler = StandardScaler()
    X = scaler.fit_transform(raw)
    model = GaussianHMM(
        n_components=2,
        covariance_type="diag",
        n_iter=200,
        tol=0.001,
        min_covar=0.05,
        random_state=42,
    ).fit(X)
    logp, posterior = forward_backward(
        model._compute_log_likelihood(X), model.startprob_, model.transmat_
    )
    states = viterbi(
        model._compute_log_likelihood(X), model.startprob_, model.transmat_
    )
    occupancy = posterior.sum(axis=0)
    history = list(model.monitor_.history)
    stable = (
        model.monitor_.converged
        and len(history) >= 2
        and -1e-3 <= history[-1] - history[-2] < model.tol
        and np.min(occupancy) >= 5
        and np.isfinite(logp)
        and np.isfinite(model.covars_).all()
    )
    if not stable:
        result["hmm"][
            "reason"
        ] = "HMM failed convergence, occupancy or numerical quality checks."
        return result
    means = scaler.inverse_transform(model.means_)
    order = np.argsort(means[:, 0])
    labels = {
        int(order[0]): "Lower heart-rate pattern",
        int(order[1]): "Higher heart-rate pattern",
    }
    result["hmm"] = {
        "available": True,
        "log_likelihood": logp,
        "posterior": [
            {
                "timestamp": r.timestamp.isoformat(),
                "time": r.timestamp.timestamp() * 1000,
                "state": int(s),
                "label": labels[int(s)],
                "state_0": float(p[0]),
                "state_1": float(p[1]),
            }
            for r, s, p in zip(complete, states, posterior)
        ],
        "states": [
            {
                "state": i,
                "label": labels[i],
                "mean_heart_rate": float(means[i, 0]),
                "mean_systolic": float(means[i, 1]),
                "occupancy": float(occupancy[i]),
            }
            for i in range(2)
        ],
        "transition_matrix": model.transmat_.tolist(),
        "method": "Gaussian HMM, maximum-likelihood EM; log-domain forward/backward and Viterbi; two descriptive states. Fitted to this sequence; no out-of-sample validation.",
    }
    return result
