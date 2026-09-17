import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import logo from '../../assets/logo/anant-exotika-logo.jpg';

const About = () => (
  <section className="page-shell">
    <div className="container">
      <div className="editorial-page">
        <div className="editorial-page__visual">
          <img src={logo} alt="ANANT EXOTIKA" />
        </div>
        <div>
          <span className="eyebrow">Our Story</span>
          <h1>Beyond Time, Beyond Luxury</h1>
          <p>
            Anant Exotika is a modern Indian luxury house devoted to pieces that feel inevitable —
            chosen with care, presented with grace, and remembered long after the occasion has passed.
          </p>
          <p>
            We believe luxury is not excess. It is attention: to material, to proportion, to the quiet
            ceremony of giving well. Each creation is curated for those who value elegance, exclusivity
            and the beauty of a well-considered moment.
          </p>
          <Button as={Link} to="/shop" variant="primary">
            Shop Collection
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default About;
