import React from 'react';
import Image from 'next/image';
import { ParagraphText } from '@/components/atoms/typograph';
import { UserLayout } from '@/components/templates/layouts/UserLayout';

const Privacy = () => {
  return (
    <UserLayout 
      tabName="Omerald | Privacy policy" 
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full">
        <div className="w-full">
          <div className="pb-12 text-center">
            <div className="w-full lg:w-full px-3 mb-12 lg:mb-0 pb-10">
              <div className="flex items-center justify-center">
                <Image
                  className="w-[70vw] md:w-[40vw] lg:w-[20vw]"
                  src="/pictures/privacy.svg"
                  alt="Privacy Illustration"
                  width={300}
                  height={300}
                />
              </div>
            </div>
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-8 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Privacy Policy</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-orange-50 py-20">
        <div className="w-full mr-auto ml-auto pl-4 pr-4 max-w-7xl">
          <div className="flex flex-wrap items-center -mx-3">
            <div className="w-full px-3">
              <div className="pb-12">
                <div className="max-w-7xl mx-auto lg:mx-0 mb-8 text-center lg:text-left">
                  <ParagraphText style="text-gray-700 mt-2 font-light italic">
                    Privacy Policy Your privacy is important to us. It is
                    omerald.com&apos;s policy to respect your privacy regarding
                    any information we may collect from you across our website,
                    Medin.life , and other sites we own and operate. We only ask
                    for personal information when we truly need it to provide a
                    service to you.<br/><br/> We collect it by fair and lawful means, with
                    your knowledge and consent. We also let you know why we&apos;re
                    collecting it and how it will be used. We only retain
                    collected information for as long as necessary to provide
                    you with your requested service. What data we store, we&apos;ll
                    protect within commercially acceptable means to prevent loss
                    and theft, as well as unauthorised access, disclosure,
                    copying, use or modification. We don&apos;t share any personally
                    identifying information publicly or with third-parties,
                    except when required to by law.<br/><br/> Our website may link to
                    external sites that are not operated by us. Please be aware
                    that we have no control over the content and practices of
                    these sites, and cannot accept responsibility or liability
                    for their respective privacy policies. You are free to
                    refuse our request for your personal information, with the
                    understanding that we may be unable to provide you with some
                    of your desired services. Your continued use of our website
                    will be regarded as acceptance of our practices around
                    privacy and personal information. If you have any questions
                    about how we handle user data and personal information, feel
                    free to contact us.<br/><br/> More Information Hopefully that has
                    clarified things for you and as was previously mentioned if
                    there is something that you aren&apos;t sure whether you
                    need or not it&apos;s usually safer to leave cookies enabled
                    in case it does interact with one of the features you use on
                    our site. This policy is effective as of Jan 2022.
                  </ParagraphText>
                  <ParagraphText style="text-gray-700 italic font-light">
                    <br/>
                    Third party vendors,                  
                    ads based on a user&apos;s prior visits to your website or
                    other websites. Google&apos;s use of advertising cookies
                    enables it and its partners to serve ads to your users based
                    on their visit to your sites and/or other sites on the
                    Internet. Users may opt out of personalized advertising by
                    visiting Ads Settings. (Alternatively, you can direct users
                    to opt out of a third-party vendor&apos;s use of cookies for
                    personalized advertising by visiting www.aboutads.info.)
                  </ParagraphText>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export async function getStaticProps() {
  return {
    props: {},
  };
}

export default Privacy;

