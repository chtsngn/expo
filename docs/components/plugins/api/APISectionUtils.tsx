import { css } from '@emotion/react';
import { theme } from '@expo/styleguide';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Code, InlineCode } from '~/components/base/code';
import { H4 } from '~/components/base/headings';
import Link from '~/components/base/link';
import { LI, UL } from '~/components/base/list';
import { B, P, Quote } from '~/components/base/paragraph';
import {
  CommentData,
  MethodParamData,
  MethodSignatureData,
  PropData,
  TypeDefinitionData,
  TypePropertyDataFlags,
} from '~/components/plugins/api/APIDataTypes';
import { Row, Cell, Table, TableHead, HeaderCell } from '~/ui/components/Table';

const isDev = process.env.NODE_ENV === 'development';

export enum TypeDocKind {
  LegacyEnum = 4,
  Enum = 8,
  Variable = 32,
  Function = 64,
  Class = 128,
  Interface = 256,
  Property = 1024,
  Method = 2048,
  TypeAlias = 4194304,
}

export type MDComponents = React.ComponentProps<typeof ReactMarkdown>['components'];

const getInvalidLinkMessage = (href: string) =>
  `Using "../" when linking other packages in doc comments produce a broken link! Please use "./" instead. Problematic link:\n\t${href}`;

export const mdComponents: MDComponents = {
  blockquote: ({ children }) => (
    <Quote>
      {/* @ts-ignore - current implementation produce type issues, this would be fixed in docs redesign */}
      {children.map(child => (child?.props?.node?.tagName === 'p' ? child?.props.children : child))}
    </Quote>
  ),
  code: ({ children, className }) =>
    className ? <Code className={className}>{children}</Code> : <InlineCode>{children}</InlineCode>,
  h1: ({ children }) => <H4>{children}</H4>,
  ul: ({ children }) => <UL>{children}</UL>,
  li: ({ children }) => <LI>{children}</LI>,
  a: ({ href, children }) => {
    if (
      href?.startsWith('../') &&
      !href?.startsWith('../..') &&
      !href?.startsWith('../react-native')
    ) {
      if (isDev) {
        throw new Error(getInvalidLinkMessage(href));
      } else {
        console.warn(getInvalidLinkMessage(href));
      }
    }
    return <Link href={href}>{children}</Link>;
  },
  p: ({ children }) => (children ? <P>{children}</P> : null),
  strong: ({ children }) => <B>{children}</B>,
  span: ({ children }) => (children ? <span>{children}</span> : null),
};

export const mdInlineComponents: MDComponents = {
  ...mdComponents,
  p: ({ children }) => (children ? <span>{children}</span> : null),
};

const nonLinkableTypes = [
  'ColorValue',
  'Component',
  'E',
  'EventSubscription',
  'File',
  'FileList',
  'Manifest',
  'NativeSyntheticEvent',
  'ParsedQs',
  'ServiceActionResult',
  'T',
  'TaskOptions',
  'Uint8Array',
  // React & React Native
  'React.FC',
  'ForwardRefExoticComponent',
  'StyleProp',
  // Cross-package permissions management
  'RequestPermissionMethod',
  'GetPermissionMethod',
  'Options',
  'PermissionHookBehavior',
];

/**
 * List of type names that should not be visible in the docs.
 */
const omittableTypes = [
  // Internal React type that adds `ref` prop to the component
  'RefAttributes',
];

/**
 * Map of internal names/type names that should be replaced with something more developer-friendly.
 */
const replaceableTypes: Partial<Record<string, string>> = {
  ForwardRefExoticComponent: 'Component',
};

const hardcodedTypeLinks: Record<string, string> = {
  AVPlaybackSource: '/versions/latest/sdk/av/#playback-api',
  AVPlaybackStatus: '/versions/latest/sdk/av/#playback-status',
  AVPlaybackStatusToSet: '/versions/latest/sdk/av/#default-initial--avplaybackstatustoset',
  Date: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date',
  Element: 'https://www.typescriptlang.org/docs/handbook/jsx.html#function-component',
  Error: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
  ExpoConfig: 'https://github.com/expo/expo-cli/blob/main/packages/config-types/src/ExpoConfig.ts',
  MessageEvent: 'https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent',
  Omit: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys',
  Pick: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys',
  Partial: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype',
  Promise:
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
  View: '/versions/latest/react-native/view',
  ViewProps: '/versions/latest/react-native/view#props',
  ViewStyle: '/versions/latest/react-native/view-style-props',
};

const renderWithLink = (name: string, type?: string) => {
  const replacedName = replaceableTypes[name] ?? name;

  return nonLinkableTypes.includes(replacedName) ? (
    replacedName + (type === 'array' ? '[]' : '')
  ) : (
    <Link
      href={hardcodedTypeLinks[replacedName] || `#${replacedName.toLowerCase()}`}
      key={`type-link-${replacedName}`}>
      {replacedName}
      {type === 'array' && '[]'}
    </Link>
  );
};

const renderUnion = (types: TypeDefinitionData[]) =>
  types.map(resolveTypeName).map((valueToRender, index) => (
    <span key={`union-type-${index}`}>
      {valueToRender}
      {index + 1 !== types.length && ' | '}
    </span>
  ));

export const resolveTypeName = ({
  elements,
  elementType,
  name,
  type,
  types,
  typeArguments,
  declaration,
  value,
  queryType,
  operator,
  objectType,
  indexType,
}: TypeDefinitionData): string | JSX.Element | (string | JSX.Element)[] => {
  try {
    if (name) {
      if (type === 'reference') {
        if (typeArguments) {
          if (name === 'Record' || name === 'React.ComponentProps') {
            return (
              <>
                {name}&lt;
                {typeArguments.map((type, index) => (
                  <span key={`record-type-${index}`}>
                    {resolveTypeName(type)}
                    {index !== typeArguments.length - 1 ? ', ' : null}
                  </span>
                ))}
                &gt;
              </>
            );
          } else {
            return (
              <>
                {renderWithLink(name)}
                &lt;
                {typeArguments.map((type, index) => (
                  <span key={`${name}-nested-type-${index}`}>
                    {resolveTypeName(type)}
                    {index !== typeArguments.length - 1 ? ', ' : null}
                  </span>
                ))}
                &gt;
              </>
            );
          }
        } else {
          return renderWithLink(name);
        }
      } else {
        return name;
      }
    } else if (elementType?.name) {
      if (elementType.type === 'reference') {
        return renderWithLink(elementType.name, type);
      } else if (type === 'array') {
        return elementType.name + '[]';
      }
      return elementType.name + type;
    } else if (elementType?.declaration) {
      if (type === 'array') {
        const { parameters, type: paramType } = elementType.declaration.indexSignature || {};
        if (parameters && paramType) {
          return `{ [${listParams(parameters)}]: ${resolveTypeName(paramType)} }`;
        }
      }
      return elementType.name + type;
    } else if (type === 'union' && types?.length) {
      return renderUnion(types);
    } else if (elementType && elementType.type === 'union' && elementType?.types?.length) {
      const unionTypes = elementType?.types || [];
      return (
        <>
          ({renderUnion(unionTypes)}){type === 'array' && '[]'}
        </>
      );
    } else if (declaration?.signatures) {
      const baseSignature = declaration.signatures[0];
      if (baseSignature?.parameters?.length) {
        return (
          <>
            (
            {baseSignature.parameters?.map((param, index) => (
              <span key={`param-${index}-${param.name}`}>
                {param.name}: {resolveTypeName(param.type)}
                {index + 1 !== baseSignature.parameters?.length && ', '}
              </span>
            ))}
            ) {'=>'} {resolveTypeName(baseSignature.type)}
          </>
        );
      } else {
        return (
          <>
            {'() =>'} {resolveTypeName(baseSignature.type)}
          </>
        );
      }
    } else if (type === 'reflection' && declaration?.children) {
      return (
        <>
          {'{ '}
          {declaration?.children.map((child: PropData, i) => (
            <span key={`reflection-${name}-${i}`}>
              {child.name + ': ' + resolveTypeName(child.type)}
              {i + 1 !== declaration?.children?.length ? ', ' : null}
            </span>
          ))}
          {' }'}
        </>
      );
    } else if (type === 'tuple' && elements) {
      return (
        <>
          [
          {elements.map((elem, i) => (
            <span key={`tuple-${name}-${i}`}>
              {resolveTypeName(elem)}
              {i + 1 !== elements.length ? ', ' : null}
            </span>
          ))}
          ]
        </>
      );
    } else if (type === 'query' && queryType) {
      return queryType.name;
    } else if (type === 'literal' && typeof value === 'boolean') {
      return `${value}`;
    } else if (type === 'literal' && value) {
      return `'${value}'`;
    } else if (type === 'intersection' && types) {
      return types
        .filter(({ name }) => !omittableTypes.includes(name ?? ''))
        .map((value, index, array) => (
          <span key={`intersection-${name}-${index}`}>
            {resolveTypeName(value)}
            {index + 1 !== array.length && ' & '}
          </span>
        ));
    } else if (type === 'indexedAccess') {
      return `${objectType?.name}['${indexType?.value}']`;
    } else if (type === 'typeOperator') {
      return operator || 'undefined';
    } else if (value === null) {
      return 'null';
    }
    return 'undefined';
  } catch (e) {
    console.warn('Type resolve has failed!', e);
    return 'undefined';
  }
};

export const parseParamName = (name: string) => (name.startsWith('__') ? name.substr(2) : name);

export const renderParamRow = ({ comment, name, type, flags }: MethodParamData): JSX.Element => {
  const defaultValue = parseCommentContent(getTagData('default', comment)?.text);
  return (
    <Row key={`param-${name}`}>
      <Cell>
        <B>{parseParamName(name)}</B>
        {renderFlags(flags)}
      </Cell>
      <Cell>
        <InlineCode>{resolveTypeName(type)}</InlineCode>
      </Cell>
      <Cell>
        <CommentTextBlock
          comment={comment}
          components={mdInlineComponents}
          afterContent={renderDefaultValue(defaultValue)}
          emptyCommentFallback="-"
        />
      </Cell>
    </Row>
  );
};

export const renderTableHeadRow = () => (
  <TableHead>
    <Row>
      <HeaderCell>Name</HeaderCell>
      <HeaderCell>Type</HeaderCell>
      <HeaderCell>Description</HeaderCell>
    </Row>
  </TableHead>
);

export const renderParams = (parameters: MethodParamData[]) => (
  <>
    <H4>Arguments</H4>
    <Table>
      {renderTableHeadRow()}
      {parameters?.map(renderParamRow)}
    </Table>
  </>
);

export const listParams = (parameters: MethodParamData[]) =>
  parameters ? parameters?.map(param => parseParamName(param.name)).join(', ') : '';

export const renderDefaultValue = (defaultValue?: string) =>
  defaultValue ? (
    <>
      <br />
      <br />
      <B>Default: </B>
      <InlineCode>{defaultValue}</InlineCode>
    </>
  ) : undefined;

export const renderTypeOrSignatureType = (
  type?: TypeDefinitionData,
  signatures?: MethodSignatureData[],
  includeParamType: boolean = false
) => {
  if (type) {
    return <InlineCode key={`signature-type-${type.name}`}>{resolveTypeName(type)}</InlineCode>;
  } else if (signatures && signatures.length) {
    return signatures.map(({ name, type, parameters }) => (
      <InlineCode key={`signature-type-${name}`}>
        (
        {parameters && includeParamType
          ? parameters.map(param => (
              <span key={`signature-param-${param.name}`}>
                {param.name}
                {param.flags?.isOptional && '?'}: {resolveTypeName(param.type)}
              </span>
            ))
          : listParams(parameters)}
        ) =&gt; {resolveTypeName(type)}
      </InlineCode>
    ));
  }
  return undefined;
};

export const renderFlags = (flags?: TypePropertyDataFlags) =>
  flags?.isOptional ? (
    <>
      <br />
      <span css={STYLES_OPTIONAL}>(optional)</span>
    </>
  ) : undefined;

export type CommentTextBlockProps = {
  comment?: CommentData;
  components?: MDComponents;
  withDash?: boolean;
  beforeContent?: JSX.Element | null;
  afterContent?: JSX.Element | null;
  includePlatforms?: boolean;
  emptyCommentFallback?: string;
};

export const parseCommentContent = (content?: string): string =>
  content && content.length ? content.replace(/&ast;/g, '*').replace(/\t/g, '') : '';

export const getCommentOrSignatureComment = (
  comment?: CommentData,
  signatures?: MethodSignatureData[]
) => comment || (signatures && signatures[0]?.comment);

export const getTagData = (tagName: string, comment?: CommentData) =>
  getAllTagData(tagName, comment)?.[0];

export const getAllTagData = (tagName: string, comment?: CommentData) =>
  comment?.tags?.filter(tag => tag.tag === tagName);

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const formatPlatformName = (name: string) => {
  const cleanName = name.toLowerCase().replace('\n', '');
  return cleanName.includes('ios')
    ? cleanName.replace('ios', 'iOS')
    : cleanName.includes('expo')
    ? cleanName.replace('expo', 'Expo Go')
    : capitalize(name);
};

export const getPlatformTags = (comment?: CommentData, breakLine: boolean = true) => {
  const platforms = getAllTagData('platform', comment);
  return platforms?.length ? (
    <>
      {platforms.map(platform => (
        <div key={platform.text} css={STYLES_PLATFORM}>
          {formatPlatformName(platform.text)} Only
        </div>
      ))}
      {breakLine && <br />}
    </>
  ) : null;
};

export const CommentTextBlock = ({
  comment,
  components = mdComponents,
  withDash,
  beforeContent,
  afterContent,
  includePlatforms = true,
  emptyCommentFallback,
}: CommentTextBlockProps) => {
  const shortText = comment?.shortText?.trim().length ? (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {parseCommentContent(comment.shortText)}
    </ReactMarkdown>
  ) : null;
  const text = comment?.text?.trim().length ? (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {parseCommentContent(comment.text)}
    </ReactMarkdown>
  ) : null;

  if (emptyCommentFallback && (!comment || (!shortText && !text))) {
    return <>{emptyCommentFallback}</>;
  }

  const examples = getAllTagData('example', comment);
  const exampleText = examples?.map((example, index) => (
    <React.Fragment key={'example-' + index}>
      {components !== mdComponents ? (
        <div css={STYLES_EXAMPLE_IN_TABLE}>
          <B>Example</B>
        </div>
      ) : (
        <H4>Example</H4>
      )}
      <ReactMarkdown components={components}>{example.text}</ReactMarkdown>
    </React.Fragment>
  ));

  const deprecation = getTagData('deprecated', comment);
  const deprecationNote = deprecation ? (
    <Quote key="deprecation-note">
      {deprecation.text.trim().length ? (
        <ReactMarkdown
          components={mdInlineComponents}>{`**Deprecated.** ${deprecation.text}`}</ReactMarkdown>
      ) : (
        <B>Deprecated</B>
      )}
    </Quote>
  ) : null;

  const see = getTagData('see', comment);
  const seeText = see ? (
    <Quote>
      <B>See: </B>
      <ReactMarkdown components={mdInlineComponents}>{see.text}</ReactMarkdown>
    </Quote>
  ) : null;

  return (
    <>
      {deprecationNote}
      {beforeContent}
      {withDash && (shortText || text) && ' - '}
      {includePlatforms && getPlatformTags(comment, !withDash)}
      {shortText}
      {text}
      {afterContent}
      {seeText}
      {exampleText}
    </>
  );
};

export const getComponentName = (name?: string, children: PropData[] = []) => {
  if (name && name !== 'default') return name;
  const ctor = children.filter((child: PropData) => child.name === 'constructor')[0];
  return ctor?.signatures?.[0]?.type?.name ?? 'default';
};

export const STYLES_OPTIONAL = css`
  color: ${theme.text.secondary};
  font-size: 90%;
  padding-top: 22px;
`;

export const STYLES_SECONDARY = css`
  color: ${theme.text.secondary};
  font-size: 90%;
  font-weight: 600;
`;

export const STYLES_PLATFORM = css`
  & {
    display: inline-block;
    background-color: ${theme.background.tertiary};
    color: ${theme.text.default};
    font-size: 90%;
    font-weight: 700;
    padding: 6px 12px;
    margin-bottom: 8px;
    margin-right: 8px;
    border-radius: 4px;
  }

  table & {
    margin-bottom: 1rem;
  }
`;

const STYLES_EXAMPLE_IN_TABLE = css`
  margin: 8px 0;
`;
