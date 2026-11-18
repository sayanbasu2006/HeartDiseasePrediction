import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { assessmentInputCounts } from "@/lib/api";
import { BrowserStorageControl } from "./BrowserStorageControl";
import { Card, ErrorBox } from "./shared";
import { useResource } from "./useResource";

export function AboutSection() {
  const info = useResource("/model-info");
  return (
    <>
      <div className="overview-banner">
        <div>
          <span className="pill">RESEARCH, IN THE OPEN</span>
          <h2>
            Useful insight.
            <br />
            Honest boundaries.
          </h2>
          <p>
            A local learning platform for exploring machine learning and
            recorded heart-health measurements.
          </p>
        </div>
        <div className="banner-wave">
          <ShieldCheck size={90} strokeWidth={1} />
        </div>
      </div>
      <div className="grid two">
        <Card>
          <h3>Where the data comes from</h3>
          <p>
            The Cleveland file contains 303 records,{" "}
            {assessmentInputCounts.required} model inputs, and a binary outcome.
            The visceral fat column contains generated indices used in training.
            One duplicate was removed before splitting the data.
          </p>
          <p>
            Category labels were verified by matching all supplied records to
            the primary UCI Cleveland reference. Missing vessel and stress-test
            entries are shown as “Not available” and cannot be used for a new
            assessment. The source outcome labels are reversed relative to the
            earlier display: the positive model class represents no recorded
            disease. Results now describe the correct dataset pattern; they
            remain experimental and cannot diagnose you.
          </p>
          <p className="caption">
            SHA-256:{" "}
            <span className="hash">
              {info.data?.dataset.sha256 ||
                "Connect backend to view fingerprint"}
            </span>
          </p>
        </Card>
        <Card>
          <h3>How models are compared</h3>
          <p>
            Stratified splitting reserves 20% of unique rows. All imputation,
            scaling, spline transformations, and category encoding occur within
            training pipelines. Nested cross-validation compares six classifier
            families and calibrated voting.
          </p>
          <p>
            The additive model transforms each continuous feature separately,
            without introducing interaction terms. Voting weights use
            predictions made out of fold inside each training fit.
          </p>
          <Link className="text-link" href="/models">
            Inspect measured performance
            <ArrowUpRight size={16} />
          </Link>
        </Card>
        <Card>
          <h3>Privacy in the local version</h3>
          <p>
            No authentication is included. This app is designed for one local
            workspace, bound to the loopback interface. Anyone with access to
            the running local app can access its saved history.
          </p>
          <p>
            Assessments, drafts, and upload previews stay in memory by default.
            Browser saving keeps a copy on this device. Anyone using this
            browser profile can open it.
          </p>
          <p>
            Saving to measurement history uses separate consent. You can delete
            those records from the timeline.
          </p>
          <BrowserStorageControl />
        </Card>
        <Card>
          <h3>What remains experimental</h3>
          <p>
            No external clinical validation, treatment recommendation, future
            event prediction, or guarantee of generalization is provided. Scores
            refer to a small dataset’s binary labels.
          </p>
          <p>
            HMM states describe learned repeated-measurement patterns, not
            disease stages. At least 30 complete, approximately regularly spaced
            observations are required. Kalman filtering only smooths recorded
            trends.
          </p>
          <p>
            The Model laboratory shows approximate BIC weights for two logistic
            specifications. The synthetic timeline is separate from the static
            classifier’s training dataset.
          </p>
        </Card>
      </div>
      <Card>
        <h3>Designed for clarity. Honest about applicability.</h3>
        <p>
          CardioLens uses familiar clinical units and Indian English date
          formatting. Its source dataset is the UCI Cleveland reference, not an
          Indian validation cohort. The interface does not establish clinical
          applicability in India, and the platform has no hospital, government,
          or medical association affiliation.
        </p>
      </Card>
      <Card>
        <h3>Technical references</h3>
        <p>
          <a
            className="text-link"
            href="https://scikit-learn.org/stable/modules/calibration.html"
            target="_blank"
            rel="noreferrer"
          >
            scikit-learn probability calibration
            <ArrowUpRight size={14} />
          </a>
        </p>
        <p>
          <a
            className="text-link"
            href="https://hmmlearn.readthedocs.io/en/stable/tutorial.html"
            target="_blank"
            rel="noreferrer"
          >
            hmmlearn sequence-model documentation
            <ArrowUpRight size={14} />
          </a>
        </p>
        <p>
          <a
            className="text-link"
            href="https://www.nhs.uk/conditions/chest-pain/"
            target="_blank"
            rel="noreferrer"
          >
            NHS chest-pain guidance
            <ArrowUpRight size={14} />
          </a>
        </p>
      </Card>
      <ErrorBox message={info.error} />
    </>
  );
}
