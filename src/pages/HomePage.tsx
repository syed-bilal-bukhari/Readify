import { Link } from "react-router-dom";
import homeBanner from "../assets/home_banner.png";
import iconHierarchy from "../assets/icon-hierarchy.svg";
import iconInsight from "../assets/icon-insight.svg";
import iconNavigation from "../assets/icon-navigation.svg";
import "./HomePage.css";

function HomePage() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Stop Hunting for Highlights. <br />
            Start Building Knowledge.
          </h1>
          <p className="hero-subtitle">
            Turn scattered notes into an instantly retrievable recall engine for
            your research.
          </p>
          <Link to="/research">
            <button className="btn-primary-large">Get Started</button>
          </Link>
        </div>
        <div className="hero-image-wrapper">
          <img
            src={homeBanner}
            alt="Readify App Screenshot"
            className="hero-image"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="feature-item">
          <div className="feature-icon">
            <img
              src={iconHierarchy}
              width={48}
              height={48}
              alt="Hierarchy Icon"
            />
          </div>
          <h3 className="feature-title">Hierarchical Order</h3>
          <p className="feature-description">
            Hierarchical order from raw sources to polished notes, keeping your
            research structured.
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <img
              src={iconNavigation}
              width={48}
              height={48}
              alt="Navigation Icon"
            />
          </div>
          <h3 className="feature-title">Instant Navigation</h3>
          <p className="feature-description">
            Instant navigation focuses on easily recalling research with just a
            click.
          </p>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <img src={iconInsight} width={48} height={48} alt="Insight Icon" />
          </div>
          <h3 className="feature-title">Connected Insight</h3>
          <p className="feature-description">
            Connected Insight with meaningful designations and enhancements for
            your workflow.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
