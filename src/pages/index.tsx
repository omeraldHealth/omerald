import Home from '@/components/molecules/home/Home';
import { UserLayout } from '@/components/templates/layouts/UserLayout';

const Root = () => {
  return (
    <UserLayout
      tabName="Omerald | Home"
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <Home />
    </UserLayout>
  );
};

export default Root;

