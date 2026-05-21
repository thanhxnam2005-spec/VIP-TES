import { useSearchParams, Navigate } from 'react-router-dom';
import Content from '../components/home/Content';
import Footer from '../components/home/Footer';
import Header from '../components/home/Header';
import { buildCatalogUrl } from '../utils/navigation';

function Home() {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get('bookId');

  if (bookId) {
    return <Navigate to={buildCatalogUrl(bookId)} replace />;
  }

  return (
    <>
      <Header />
      <Content />
      <Footer />
    </>
  );
}

export default Home;
