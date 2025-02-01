import React from 'react';
import Image from 'next/image';
import { ParagraphText } from '@/components/atoms/typograph';
import { UserLayout } from '@/components/templates/layouts/UserLayout';

const Terms = () => {
  return (
    <UserLayout 
      tabName="Omerald | Terms" 
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full">
        <div className="w-full">
          <div className="py-12 text-center">
            <div className="w-full lg:w-full px-3 mb-12 lg:mb-0 pb-10">
              <div className="flex items-center justify-center">
                <Image
                  className="w-[70vw] md:w-[40vw] lg:w-[20vw]"
                  src="/pictures/terms.svg"
                  alt="Terms Illustration"
                  width={300}
                  height={300}
                />
              </div>
            </div>
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-8 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Terms of Service</span>
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
                  <ParagraphText>Last updated on March 30 2024</ParagraphText>
                  <ParagraphText style="text-gray-600 italic font-light">
                    <br/>
                    AGREEMENT TO TERMS <br/> <br/>
                    These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity (&quot;you&quot;) and MedIn Life (&quot;we,&quot; &quot;us&quot; or &quot;our&quot;), concerning your access to and use of the [Omerald.com] website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the &quot;Site&quot;). 
                    You agree that by accessing the Site, you have read, understood, and agree to be bound by all of these Terms of Use. If you do not agree with all of these Terms of Use, then you are expressly prohibited from using the Site and you must discontinue use immediately.
                    Supplemental Terms of Use or documents that may be posted on the Site from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Terms of Use at any time and for any reason. 
                    We will alert you about any changes by updating the &quot;Last updated&quot; date of these Terms of Use, and you waive any right to receive specific notice of each such change. 
                    <br/>
                    <br/>
                    It is your responsibility to periodically review these Terms of Use to stay informed of updates. You will be subject to, and will be deemed to have been made aware of and to have accepted, the changes in any revised Terms of Use by your continued use of the Site after the date such revised Terms of Use are posted. 
                    The information provided on the Site is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. 
                    <br/>
                    <br/>
                    Accordingly, those persons who choose to access the Site from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable. 
                    Option 1: The Site is intended for users who are at least 18 years old. Persons under the age of 18 are not permitted to register for the Site. 
                    Option 2: [The Site is intended for users who are at least 13 years of age.] All users who are minors in the jurisdiction in which they reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to use the Site. If you are a minor, you must have your parent or guardian read and agree to these Terms of Use prior to you using the Site. 
                    <br/>
                    <br/>
                          
                    INTELLECTUAL PROPERTY RIGHTS <br/> <br/>
                    Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the &quot;Content&quot;) and the trademarks, service marks, and logos contained therein (the &quot;Marks&quot;) are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of the India, foreign jurisdictions, and international conventions. 
                    The Content and the Marks are provided on the Site &quot;AS IS&quot; for your information and personal use only. Except as expressly provided in these Terms of Use, no part of the Site and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.
                    Provided that you are eligible to use the Site, you are granted a limited license to access and use the Site and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use. We reserve all rights not expressly granted to you in and to the Site, the Content and the Marks.
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

export default Terms;

